import { computed, ref } from 'vue';

const PASSWORD_SYNC_SERVER = import.meta.env.VITE_SYNC_SERVER_URL || import.meta.env.VITE_UPDATE_SERVER_URL || '';
const PASSWORD_SYNC_TOKEN = import.meta.env.VITE_PASSWORD_SYNC_TOKEN || import.meta.env.VITE_TODO_SYNC_TOKEN || '';
const PASSWORD_KEY = 'passwords';
const isElectron = typeof window !== 'undefined' && window.electronAPI;

const records = ref([]);
const loaded = ref(false);
const loading = ref(false);
const lastError = ref('');

let loadPromise = null;
let retryTimer = null;

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry() {
  if (retryTimer || !getCloudEnabled()) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    void ensurePasswordRecordsLoaded({ force: true });
  }, 15000);
}

function getCloudEnabled() {
  return Boolean(PASSWORD_SYNC_SERVER && PASSWORD_SYNC_TOKEN);
}

async function loadData(key, fallback) {
  if (isElectron) {
    const data = await window.electronAPI.store.get(key);
    return data ?? fallback;
  }

  const raw = localStorage.getItem(`wb_${key}`);
  return raw ? JSON.parse(raw) : fallback;
}

async function saveData(key, data) {
  if (isElectron) {
    await window.electronAPI.store.set(key, data);
    return;
  }

  localStorage.setItem(`wb_${key}`, JSON.stringify(data));
}

function normalizePasswordRecord(item = {}) {
  const createdAt = item.createdAt || new Date().toISOString();
  const updatedAt = item.updatedAt || createdAt;
  return {
    id: String(item.id || '').trim(),
    name: String(item.name || '').trim(),
    category: String(item.category || 'other').trim() || 'other',
    host: String(item.host || '').trim(),
    port: String(item.port || '').trim(),
    username: String(item.username || '').trim(),
    password: String(item.password || ''),
    remark: String(item.remark || '').trim(),
    deleted: Boolean(item.deleted),
    createdAt,
    updatedAt,
    deletedAt: item.deletedAt || null,
  };
}

function canSyncPasswordRecord(item) {
  if (!item?.id || !item?.name) {
    return false;
  }

  if (item.deleted) {
    return true;
  }

  return Boolean(String(item.password || ''));
}

async function loadLocalRecords() {
  const list = await loadData(PASSWORD_KEY, []);
  return Array.isArray(list) ? list.map(normalizePasswordRecord) : [];
}

async function saveLocalRecords(list) {
  await saveData(PASSWORD_KEY, list.map(normalizePasswordRecord));
}

function sortRecords(list) {
  return [...list].sort((a, b) => {
    const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

function pickNewerRecord(a, b) {
  const aTime = new Date(a.updatedAt).getTime();
  const bTime = new Date(b.updatedAt).getTime();

  if (aTime !== bTime) {
    return aTime > bTime ? a : b;
  }

  if (a.deleted !== b.deleted) {
    return a.deleted ? a : b;
  }

  return b;
}

function mergePasswordRecords(...lists) {
  const map = new Map();

  lists.flat().forEach((item) => {
    const normalized = normalizePasswordRecord(item);
    if (!canSyncPasswordRecord(normalized)) {
      return;
    }

    const current = map.get(normalized.id);
    map.set(normalized.id, current ? pickNewerRecord(current, normalized) : normalized);
  });

  return sortRecords([...map.values()]);
}

function toComparableJson(list) {
  return JSON.stringify(
    sortRecords(list).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      host: item.host,
      port: item.port,
      username: item.username,
      password: item.password,
      remark: item.remark,
      deleted: item.deleted,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    }))
  );
}

async function requestPasswordList(path, init) {
  const response = await fetch(`${PASSWORD_SYNC_SERVER}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': PASSWORD_SYNC_TOKEN,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = text ? JSON.parse(text) : null;
      throw new Error(parsed?.error || text || `请求失败: ${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error(text || `请求失败: ${response.status}`);
    }
  }

  return response.json();
}

async function fetchRemoteRecords() {
  const response = await requestPasswordList('/api/sync/passwords');
  return Array.isArray(response.items) ? response.items.map(normalizePasswordRecord) : [];
}

async function applyRecords(nextRecords) {
  const normalized = sortRecords(nextRecords.map(normalizePasswordRecord));
  records.value = normalized;
  await saveLocalRecords(normalized);
  loaded.value = true;
  return normalized;
}

async function syncRemoteAndLocal(localRecords) {
  const remoteRecords = await fetchRemoteRecords();
  const skippedLocalRecords = localRecords
    .map(normalizePasswordRecord)
    .filter((item) => !canSyncPasswordRecord(item));

  if (skippedLocalRecords.length > 0) {
    console.warn(
      '[passwordCloudStore] skip invalid local password records during sync',
      skippedLocalRecords.map((item) => item.id)
    );
  }

  const mergedRecords = mergePasswordRecords(localRecords, remoteRecords);

  if (toComparableJson(mergedRecords) === toComparableJson(remoteRecords)) {
    return applyRecords(mergedRecords);
  }

  const response = await requestPasswordList('/api/sync/passwords/sync', {
    method: 'POST',
    body: JSON.stringify({
      items: mergedRecords,
      sourceApp: 'work-bench',
    }),
  });

  return applyRecords(Array.isArray(response.items) ? response.items : []);
}

export function getPasswordSyncConfig() {
  return {
    enabled: getCloudEnabled(),
    serverUrl: PASSWORD_SYNC_SERVER,
  };
}

export async function ensurePasswordRecordsLoaded(options = {}) {
  const { force = false } = options;

  if (loaded.value && !force && !(getCloudEnabled() && lastError.value)) {
    return records.value;
  }

  if (loadPromise && !force) {
    return loadPromise;
  }

  loadPromise = (async () => {
    loading.value = true;
    lastError.value = '';

    try {
      const localRecords = await loadLocalRecords();

      if (!getCloudEnabled()) {
        clearRetryTimer();
        return applyRecords(localRecords);
      }

      try {
        const result = await syncRemoteAndLocal(localRecords);
        clearRetryTimer();
        lastError.value = '';
        return result;
      } catch (error) {
        console.error('[passwordCloudStore] load failed', error);
        lastError.value = error instanceof Error ? error.message : '加载云端密码库失败';
        scheduleRetry();
        return applyRecords(localRecords);
      }
    } finally {
      loading.value = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function createPasswordRecord(record) {
  await ensurePasswordRecordsLoaded();

  const payload = normalizePasswordRecord(record);

  if (!getCloudEnabled()) {
    return applyRecords([payload, ...records.value.filter((item) => item.id !== payload.id)]);
  }

  const response = await requestPasswordList('/api/sync/passwords', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      sourceApp: 'work-bench',
    }),
  });

  clearRetryTimer();
  lastError.value = '';
  return applyRecords(Array.isArray(response.items) ? response.items : []);
}

export async function updatePasswordRecord(id, patch) {
  await ensurePasswordRecordsLoaded();

  const existing = records.value.find((item) => item.id === id);
  if (!existing || existing.deleted) {
    throw new Error('账号记录不存在');
  }

  const merged = normalizePasswordRecord({
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
    deleted: false,
    deletedAt: null,
  });

  if (!getCloudEnabled()) {
    return applyRecords(records.value.map((item) => (item.id === id ? merged : item)));
  }

  const response = await requestPasswordList(`/api/sync/passwords/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...merged,
      sourceApp: 'work-bench',
    }),
  });

  clearRetryTimer();
  lastError.value = '';
  return applyRecords(Array.isArray(response.items) ? response.items : []);
}

export async function deletePasswordRecord(id) {
  await ensurePasswordRecordsLoaded();

  const existing = records.value.find((item) => item.id === id);
  if (!existing || existing.deleted) {
    throw new Error('账号记录不存在');
  }

  if (!getCloudEnabled()) {
    return applyRecords(
      records.value.map((item) => (
        item.id === id
          ? normalizePasswordRecord({
              ...item,
              deleted: true,
              updatedAt: new Date().toISOString(),
              deletedAt: new Date().toISOString(),
            })
          : item
      ))
    );
  }

  const response = await requestPasswordList(`/api/sync/passwords/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      sourceApp: 'work-bench',
    }),
  });

  clearRetryTimer();
  lastError.value = '';
  return applyRecords(Array.isArray(response.items) ? response.items : []);
}

export function usePasswordVault() {
  void ensurePasswordRecordsLoaded();

  return {
    passwords: computed(() => records.value.filter((item) => !item.deleted)),
    allPasswords: computed(() => records.value),
    loaded,
    loading,
    lastError,
    syncConfig: getPasswordSyncConfig(),
    refreshPasswords: () => ensurePasswordRecordsLoaded({ force: true }),
  };
}
