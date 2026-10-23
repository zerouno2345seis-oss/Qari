const { contextBridge, ipcRenderer } = require('electron');

const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('macpulse', {
  onTick: cb => {
    const h = (_e, s) => cb(s);
    ipcRenderer.on('metrics:tick', h);
    return () => ipcRenderer.removeListener('metrics:tick', h);
  },
  getProfile: call('profile:get'),
  scanCleanup: call('cleaner:scan'),
  runCleanup: call('cleaner:clean'),
  listStartup: call('startup:list'),
  startupDisable: call('startup:disable'),
  startupEnable: call('startup:enable'),
  listLoginItems: call('login:list'),
  removeLoginItem: call('login:remove'),
  killProcess: call('process:kill'),
  reveal: call('fs:reveal'),
  sensorsEnable: call('sensors:enable'),
  sensorsDisable: call('sensors:disable'),
  history: call('history:query'),
  exportHistory: call('history:export'),
  listActions: call('actions:list'),
  runAction: call('actions:run'),
  benchmark: call('bench:run'),
  folderSizes: call('disk:folders'),
  largeFiles: call('disk:large'),
  trashPath: call('disk:trash'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
});
