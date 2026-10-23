const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const { sample } = require('./collector');
const { getProfile } = require('./profile');
const cleaner = require('./cleaner');
const startup = require('./startup');
const actions = require('./actions');
const disk = require('./disk');
const benchmark = require('./benchmark');
const { assess } = require('./capabilities');
const { createSensors } = require('./powermetrics');
const { createNetPoller } = require('./nettop');
const { createSettings } = require('./settings');
const { createAlerts } = require('./alerts');
const { createHistory } = require('./history');

const DEV_URL = process.env.VITE_DEV_URL;
const TICK_MS = 2000;
let win;
let tray;
let ctx = { startupCount: 0, cleanableBytes: 0, sensors: null, netApps: [] };
let settings, sensors, history, alerts, pollNet;

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

function startNetLoop() {
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try { ctx.netApps = await pollNet(); } finally { busy = false; }
  }, 3000);
}

function startLoop() {
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      ctx.sensors = sensors.read();
      const s = await sample(ctx);
      if (settings.get().historyEnabled) history.record(s);
      for (const a of alerts(s)) new Notification({ title: `MacPulse: ${a.title}`, body: a.body }).show();
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

const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { return { ok: false, error: e.message }; } };
const confirm = async (message, detail, ok) => (await dialog.showMessageBox(win, { type: 'warning', buttons: ['إلغاء', ok], defaultId: 0, message, detail })).response === 1;

ipcMain.handle('startup:disable', guard(async (_e, file) => (await confirm('تعطيل عنصر بدء التشغيل؟', `${file}\nيمكنك إعادة تفعيله لاحقًا.`, 'تعطيل')) ? startup.disable(file) : { cancelled: true }));
ipcMain.handle('startup:enable', guard((_e, file) => startup.enable(file)));
ipcMain.handle('login:list', guard(() => startup.listLoginItems()));
ipcMain.handle('login:remove', guard(async (_e, name) => (await confirm('إزالة عنصر تسجيل الدخول؟', String(name), 'إزالة')) ? startup.removeLoginItem(name) : { cancelled: true }));

ipcMain.handle('sensors:enable', guard(async () => { await sensors.enable(); return { ok: true }; }));
ipcMain.handle('sensors:disable', guard(() => { sensors.disable(); return { ok: true }; }));

ipcMain.handle('history:query', (_e, rangeMs) => history.query(Math.min(24 * 3600 * 1000, Number(rangeMs) || 3600000)));
ipcMain.handle('history:export', guard(async () => {
  const r = await dialog.showSaveDialog(win, { defaultPath: 'macpulse-history.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (r.canceled || !r.filePath) return { cancelled: true };
  fs.writeFileSync(r.filePath, history.toCsv());
  return { ok: true, file: r.filePath };
}));

ipcMain.handle('actions:list', () => actions.list());
ipcMain.handle('actions:run', guard(async (_e, id) => (await confirm('تنفيذ الإجراء؟', (actions.list().find(a => a.id === id) || {}).name || '', 'تنفيذ')) ? actions.run(id) : { cancelled: true }));

ipcMain.handle('bench:run', guard(async () => {
  const bench = await benchmark.run();
  return { ok: true, bench, advice: assess(await getProfile(), bench) };
}));

ipcMain.handle('disk:folders', guard(() => disk.folderSizes()));
ipcMain.handle('disk:large', guard((_e, mb) => disk.largeFiles(mb)));
ipcMain.handle('disk:trash', guard(async (_e, p) => {
  if (!disk.insideHome(p)) throw new Error('المسار خارج مجلد المستخدم');
  if (!(await confirm('نقل الملف إلى السلة؟', p, 'نقل إلى السلة'))) return { cancelled: true };
  await shell.trashItem(p);
  return { ok: true };
}));

ipcMain.handle('settings:get', () => settings.get());
ipcMain.handle('settings:set', (_e, patch) => settings.set(patch));

app.whenReady().then(() => {
  const dataDir = app.getPath('userData');
  settings = createSettings(dataDir);
  sensors = createSensors(path.join(dataDir, 'sensors'));
  history = createHistory(path.join(dataDir, 'history'));
  alerts = createAlerts(settings.get);
  pollNet = createNetPoller();
  createWindow();
  startNetLoop();
  setupTray();
  startLoop();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
