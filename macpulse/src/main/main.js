const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

ipcMain.handle('metrics:snapshot', async () => {
  const [cpu, load, mem, temp, battery, procs, disks, net] = await Promise.all([
    si.cpu(), si.currentLoad(), si.mem(), si.cpuTemperature(),
    si.battery(), si.processes(), si.fsSize(), si.networkStats(),
  ]);
  const top = [...procs.list]
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10)
    .map(p => ({ pid: p.pid, name: p.name, cpu: p.cpu, mem: p.memRss }));
  return { cpu, load, mem, temp, battery, top, disks, net };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
