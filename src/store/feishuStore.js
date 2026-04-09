import { getTodoSyncConfig } from './todoCloudStore';

const SETTINGS_KEY = 'feishu_todo_settings';
const SENT_LOG_KEY = 'feishu_todo_sent_log';
const isElectron = typeof window !== 'undefined' && window.electronAPI;

const defaultSettings = {
  webhook: '',
  autoEnabled: false,
  mentionUserId: '',
};

function escapeFeishuText(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildFeishuText({ title, text, mentionUserId }) {
  const parts = [String(title || '').trim(), String(text || '').trim()].filter(Boolean);
  const nextMentionUserId = String(mentionUserId || '').trim();

  if (nextMentionUserId) {
    parts.push(`<at user_id="${escapeFeishuText(nextMentionUserId)}">${escapeFeishuText('你')}</at>`);
  }

  return parts.join('\n');
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

export async function sendFeishuBotMessage({ webhook, title, text, mentionUserId }) {
  const nextWebhook = String(webhook || '').trim();
  const nextTitle = String(title || 'WorkBench 提醒').trim();
  const nextText = String(text || '').trim();

  if (!nextWebhook) {
    throw new Error('请先配置飞书机器人 webhook');
  }

  if (!nextText) {
    throw new Error('提醒内容为空');
  }

  if (window.electronAPI?.feishu?.send) {
    return window.electronAPI.feishu.send({
      webhook: nextWebhook,
      title: nextTitle,
      text: nextText,
      mentionUserId: String(mentionUserId || '').trim(),
    });
  }

  const response = await fetch(nextWebhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      msg_type: 'text',
      content: {
        text: buildFeishuText({
          title: nextTitle,
          text: nextText,
          mentionUserId,
        }),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `飞书请求失败: ${response.status}`);
  }

  return response.json();
}

async function requestServer(path, init) {
  const syncConfig = getTodoSyncConfig();
  const serverUrl = syncConfig.serverUrl || '';
  const token = import.meta.env.VITE_TODO_SYNC_TOKEN || '';

  if (!syncConfig.enabled || !serverUrl || !token) {
    throw new Error('待办服务端未配置，无法保存服务端飞书提醒设置');
  }

  const response = await fetch(`${serverUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Token': token,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json();
}

export async function getFeishuTodoSettings() {
  const syncConfig = getTodoSyncConfig();
  if (syncConfig.enabled) {
    try {
      const result = await requestServer('/api/sync/feishu/settings');
      const next = {
        ...defaultSettings,
        ...(result?.settings || {}),
      };
      await saveData(SETTINGS_KEY, next);
      return next;
    } catch (error) {
      console.warn('[feishu] load server settings failed', error);
    }
  }

  const settings = await loadData(SETTINGS_KEY, defaultSettings);
  return {
    ...defaultSettings,
    ...(settings || {}),
  };
}

export async function saveFeishuTodoSettings(settings) {
  const next = {
    ...defaultSettings,
    ...(settings || {}),
  };

  await saveData(SETTINGS_KEY, next);

  const syncConfig = getTodoSyncConfig();
  if (syncConfig.enabled) {
    const result = await requestServer('/api/sync/feishu/settings', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
    const saved = {
      ...defaultSettings,
      ...(result?.settings || next),
    };
    await saveData(SETTINGS_KEY, saved);
    return saved;
  }

  return next;
}

export async function triggerServerFeishuCheck() {
  const syncConfig = getTodoSyncConfig();
  if (!syncConfig.enabled) {
    return { sent: 0, items: [] };
  }

  return requestServer('/api/sync/feishu/check', {
    method: 'POST',
  });
}

export async function getFeishuSentLog() {
  return loadData(SENT_LOG_KEY, {});
}

export async function markFeishuReminderSent(key, timestamp = new Date().toISOString()) {
  const log = await getFeishuSentLog();
  const next = {
    ...log,
    [key]: timestamp,
  };
  await saveData(SENT_LOG_KEY, next);
  return next;
}
