import { useState, useEffect, useCallback } from 'react';

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
  } else {
    localStorage.setItem(`wb_${key}`, JSON.stringify(data));
  }
}

export function usePersistentState(key, fallback) {
  const [state, setState] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData(key, fallback).then((data) => {
      setState(data);
      setLoaded(true);
    });
  }, [key]);

  const update = useCallback(
    (newState) => {
      const value = typeof newState === 'function' ? newState(state) : newState;
      setState(value);
      saveData(key, value);
    },
    [key, state]
  );

  return [state, update, loaded];
}
