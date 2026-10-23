const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macpulse', {
  snapshot: () => ipcRenderer.invoke('metrics:snapshot'),
});
