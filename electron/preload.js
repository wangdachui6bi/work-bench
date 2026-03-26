const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, data) => ipcRenderer.invoke('store:set', key, data),
  },
  feishu: {
    send: (payload) => ipcRenderer.invoke('feishu:send', payload),
  },
  app: {
    onNavigate: (callback) => {
      const handler = (_event, key) => callback(key);
      ipcRenderer.on('app:navigate', handler);
      return () => ipcRenderer.removeListener('app:navigate', handler);
    },
  },
});
