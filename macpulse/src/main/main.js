const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { sample } = require('./collector');
const { getProfile } = require('./profile');
const cleaner = require('./cleaner');
const startup = require('./startup');

const DEV_URL = process.env.VITE_DEV_URL;
const TICK_MS = 2000;
let win;
let tray;
let ctx = { startupCount: 0, cleanableBytes: 0 };

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
}

function setupTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('MacPulse');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'فتح MacPulse', click: () => (win ? win.show() : createWindow()) },
    { type: 'separator' },
    { label: 'خروج', role: 'quit' },
  ]));
}

function startLoop() {
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const s = await sample(ctx);
      if (tray) tray.setTitle(`CPU ${s.cpu.load.toFixed(0)}% · RAM ${((s.mem.used / s.mem.total) * 100).toFixed(0)}%`);
      if (win && !win.isDestroyed()) win.webContents.send('metrics:tick', s);
    } catch (e) {
      console.error('sample failed', e);
    } finally {
      busy = false;
    }
  }, TICK_MS);
}

ipcMain.handle('profile:get', () => getProfile());
ipcMain.handle('startup:list', () => {
  const items = startup.list();
  ctx.startupCount = items.length;
  return items;
});
ipcMain.handle('cleaner:scan', async () => {
  const rows = await cleaner.scan();
  ctx.cleanableBytes = rows.reduce((a, r) => a + r.bytes, 0);
  return rows;
});
ipcMain.handle('cleaner:clean', async (_e, ids) => {
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['إلغاء', 'نقل إلى السلة'],
    defaultId: 0,
    message: 'سيتم نقل الملفات المحددة إلى سلة المحذوفات.',
    detail: 'يمكنك استرجاعها من السلة ما لم تُفرغها.',
  });
  if (response !== 1) return { cancelled: true };
  return cleaner.clean(ids, p => shell.trashItem(p));
});
ipcMain.handle('process:kill', async (_e, pid) => {
  if (!Number.isInteger(pid) || pid <= 1 || pid === process.pid) return { ok: false, error: 'عملية غير مسموحة' };
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning', buttons: ['إلغاء', 'إنهاء العملية'], defaultId: 0, message: `إنهاء العملية ${pid}؟`,
  });
  if (response !== 1) return { cancelled: true };
  try { process.kill(pid, 'SIGTERM'); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('fs:reveal', (_e, file) => shell.showItemInFolder(file));

app.whenReady().then(() => {
  createWindow();
  setupTray();
  startLoop();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
