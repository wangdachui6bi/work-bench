import { ref, watch } from 'vue';

const isElectron = typeof window !== 'undefined' && window.electronAPI;

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

export function usePersistentState(key, fallback) {
  const state = ref(fallback);
  const loaded = ref(false);

  loadData(key, fallback).then((data) => {
    state.value = data;
    loaded.value = true;
  });

  watch(
    state,
    (value) => {
      if (!loaded.value) return;
      saveData(key, value);
    },
    { deep: true }
  );

  return { state, loaded };
}
