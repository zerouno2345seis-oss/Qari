const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macpulse', {
  onTick: cb => {
    const h = (_e, s) => cb(s);
    ipcRenderer.on('metrics:tick', h);
    return () => ipcRenderer.removeListener('metrics:tick', h);
  },
  getProfile: () => ipcRenderer.invoke('profile:get'),
  scanCleanup: () => ipcRenderer.invoke('cleaner:scan'),
  runCleanup: ids => ipcRenderer.invoke('cleaner:clean', ids),
  listStartup: () => ipcRenderer.invoke('startup:list'),
  killProcess: pid => ipcRenderer.invoke('process:kill', pid),
  reveal: file => ipcRenderer.invoke('fs:reveal', file),
});
