import dayjs from 'dayjs';

const TODO_SYNC_SERVER = import.meta.env.VITE_SYNC_SERVER_URL || import.meta.env.VITE_UPDATE_SERVER_URL || '';
const TODO_SYNC_TOKEN = import.meta.env.VITE_TODO_SYNC_TOKEN || '';
const TODO_KEY = 'todos';
const isElectron = typeof window !== 'undefined' && window.electronAPI;

function getCloudEnabled() {
  return Boolean(TODO_SYNC_SERVER && TODO_SYNC_TOKEN);
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

function normalizeWorkbenchTodo(item) {
  const createdAt = item.createdAt || new Date().toISOString();
  return {
    id: item.id,
    title: item.title || item.text || '',
    date: item.date || dayjs(createdAt).format('YYYY-MM-DD'),
    time: item.time || '',
    priority: item.priority || 'medium',
    done: Boolean(item.done),
    createdAt,
    updatedAt: item.updatedAt || createdAt,
    deletedAt: item.deletedAt || null,
  };
}

async function loadLocalTodos() {
  const list = await loadData(TODO_KEY, []);
  return (list || []).map(normalizeWorkbenchTodo);
}

async function saveLocalTodos(list) {
  await saveData(TODO_KEY, list.map(normalizeWorkbenchTodo));
}

function toWorkbenchTodo(item) {
  const meta = item.meta || {};
  return normalizeWorkbenchTodo({
    id: item.id,
    title: item.text,
    date: meta.date || dayjs(item.createdAt).format('YYYY-MM-DD'),
    time: meta.time || '',
    priority: meta.priority || 'medium',
    done: item.completed,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt || null,
  });
}

function toServerTodo(item) {
  const normalized = normalizeWorkbenchTodo(item);
  return {
    id: normalized.id,
    text: normalized.title,
    completed: normalized.done,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    deletedAt: normalized.deletedAt || null,
    meta: {
      date: normalized.date,
      time: normalized.time,
      priority: normalized.priority,
      source: 'work-bench',
    },
  };
}

async function requestTodoList(path, init) {
  const response = await fetch(`${TODO_SYNC_SERVER}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': TODO_SYNC_TOKEN,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json();
}

export function getTodoSyncConfig() {
  return {
    enabled: getCloudEnabled(),
    serverUrl: TODO_SYNC_SERVER,
  };
}

export async function fetchTodos() {
  if (!getCloudEnabled()) {
    return loadLocalTodos();
  }

  const response = await requestTodoList('/api/sync/todos');
  const todos = (response.items || []).map(toWorkbenchTodo);
  await saveLocalTodos(todos);
  return todos;
}

export async function createTodo(todo) {
  if (!getCloudEnabled()) {
    const local = await loadLocalTodos();
    const next = [normalizeWorkbenchTodo(todo), ...local];
    await saveLocalTodos(next);
    return next;
  }

  const response = await requestTodoList('/api/sync/todos', {
    method: 'POST',
    body: JSON.stringify({
      ...toServerTodo(todo),
      sourceApp: 'work-bench',
    }),
  });
  const todos = (response.items || []).map(toWorkbenchTodo);
  await saveLocalTodos(todos);
  return todos;
}

export async function updateTodo(id, patch) {
  if (!getCloudEnabled()) {
    const local = await loadLocalTodos();
    const next = local.map((item) => (
      item.id === id
        ? normalizeWorkbenchTodo({ ...item, ...patch, updatedAt: new Date().toISOString() })
        : item
    ));
    await saveLocalTodos(next);
    return next;
  }

  const existing = (await loadLocalTodos()).find((item) => item.id === id);
  if (!existing) {
    throw new Error('待办不存在');
  }

  const merged = normalizeWorkbenchTodo({ ...existing, ...patch, updatedAt: new Date().toISOString() });
  const response = await requestTodoList(`/api/sync/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      text: merged.title,
      completed: merged.done,
      meta: {
        date: merged.date,
        time: merged.time,
        priority: merged.priority,
        source: 'work-bench',
      },
      sourceApp: 'work-bench',
    }),
  });
  const todos = (response.items || []).map(toWorkbenchTodo);
  await saveLocalTodos(todos);
  return todos;
}

export async function toggleTodoDone(id) {
  const existing = (await loadLocalTodos()).find((item) => item.id === id);
  if (!existing) {
    throw new Error('待办不存在');
  }

  return updateTodo(id, { done: !existing.done });
}

export async function deleteTodoById(id) {
  if (!getCloudEnabled()) {
    const local = await loadLocalTodos();
    const next = local.filter((item) => item.id !== id);
    await saveLocalTodos(next);
    return next;
  }

  const response = await requestTodoList(`/api/sync/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      sourceApp: 'work-bench',
    }),
  });
  const todos = (response.items || []).map(toWorkbenchTodo);
  await saveLocalTodos(todos);
  return todos;
}

export async function clearCompletedTodos() {
  if (!getCloudEnabled()) {
    const local = await loadLocalTodos();
    const next = local.filter((item) => !item.done);
    await saveLocalTodos(next);
    return next;
  }

  const response = await requestTodoList('/api/sync/todos/clear-completed', {
    method: 'POST',
    body: JSON.stringify({
      sourceApp: 'work-bench',
    }),
  });
  const todos = (response.items || []).map(toWorkbenchTodo);
  await saveLocalTodos(todos);
  return todos;
}
