// Uses the Electron bridge when present; otherwise a mock feed so the UI can be developed in a browser.
const GB = 1024 ** 3;
const mockSensors = { active: false };
let mockSettings = { notifications: true, historyEnabled: true, cpuAlert: 90, memAlert: 92, tempAlert: 90, diskFreeAlert: 10, batteryAlert: 15, sustainSamples: 3 };
let mockStartup = [
  { label: 'com.spotify.webhelper', file: '~/Library/LaunchAgents/com.spotify.webhelper.plist', scope: 'المستخدم', runAtLoad: true, disabled: false },
  { label: 'com.docker.vmnetd', file: '/Library/LaunchDaemons/com.docker.vmnetd.plist', scope: 'النظام (خدمة)', runAtLoad: true, disabled: false },
  { label: 'com.adobe.acc', file: '/Library/LaunchAgents/com.adobe.acc.plist', scope: 'كل المستخدمين', runAtLoad: true, disabled: true },
];

function mockSampler() {
  let cpu = 30, mem = 9 * GB, temp = 55, rx = 2e5, tx = 6e4;
  const walk = (v, step, lo, hi) => Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * step));
  const names = ['Google Chrome Helper', 'Xcode', 'WindowServer', 'Slack', 'Spotify', 'Code Helper', 'Finder', 'Safari', 'Docker', 'node', 'Mail', 'Photos'];
  return () => {
    cpu = walk(cpu, 18, 4, 98); mem = walk(mem, 0.4 * GB, 6 * GB, 15.2 * GB); temp = walk(temp, 5, 38, 97);
    rx = walk(rx, 4e5, 0, 6e6); tx = walk(tx, 1.5e5, 0, 2e6);
    const total = 16 * GB;
    const top = names.map((name, i) => ({
      pid: 100 + i * 37, name, cpu: Math.max(0, (cpu / (i + 1.4)) * (0.6 + Math.random() * 0.8)),
      memBytes: (1.8 - i * 0.12) * GB * (0.8 + Math.random() * 0.4), memPct: 0, user: 'user',
    })).map(p => ({ ...p, memPct: (p.memBytes / total) * 100 })).sort((a, b) => b.cpu - a.cpu);
    const s = {
      t: Date.now(),
      cpu: { load: cpu, user: cpu * 0.65, system: cpu * 0.35, cores: Array.from({ length: 10 }, (_, i) => Math.min(100, Math.max(0, cpu * (1.3 - i * 0.07) + (Math.random() - 0.5) * 25))) },
      mem: { total, used: mem, free: total - mem, swapUsed: mem > 13 * GB ? 2.4 * GB : 0.3 * GB, swapTotal: 4 * GB, wired: 2.2 * GB, pressure: mem > 14 * GB ? 'warn' : 'normal' },
      temp: { cpu: temp, cores: [] },
      battery: { hasBattery: true, percent: 72, charging: false, cycles: 312, health: 91, timeRemaining: 214 },
      net: { rx, tx }, io: { read: Math.random() * 40, write: Math.random() * 25 },
      disks: [{ mount: '/', fs: 'APFS', size: 500 * GB, used: 410 * GB, usePct: 82 }],
      processCount: 412, top,
      sensors: mockSensors.active ? { active: true, dieTemp: temp, gpu: { active: Math.max(0, cpu * 0.4), freqMHz: 444 }, thermal: temp > 88 ? 'Heavy' : temp > 75 ? 'Moderate' : 'Nominal', fans: [1800 + temp * 20, 1750 + temp * 20], power: { cpu: cpu / 12, gpu: cpu / 40, ane: 0, package: cpu / 12 + cpu / 40 } } : { active: false },
      netApps: [{ name: 'Google Chrome', pid: 1, rx: rx * 0.6, tx: tx * 0.5 }, { name: 'Dropbox', pid: 2, rx: rx * 0.25, tx: tx * 0.4 }, { name: 'Spotify', pid: 3, rx: rx * 0.1, tx: 2000 }],
    };
    const memPct = (s.mem.used / total) * 100;
    s.score = Math.round(Math.max(0, 100 - Math.max(0, cpu - 50) * 0.5 - Math.max(0, memPct - 60) * 0.6 - Math.max(0, temp - 70) * 0.8));
    s.advice = [];
    if (cpu > 85) s.advice.push({ id: 'cpu-high', severity: 'critical', title: 'حِمل المعالج مرتفع جدًا', detail: `المعالج عند ${cpu.toFixed(0)}%، وأكبر مستهلك: ${top[0].name}` });
    if (temp >= 85) s.advice.push({ id: 'temp-high', severity: 'warning', title: 'حرارة المعالج مرتفعة', detail: `${temp.toFixed(0)}°C وقد يتباطأ المعالج تلقائيًا.` });
    if (memPct > 80) s.advice.push({ id: 'mem-high', severity: 'warning', title: 'الذاكرة مرتفعة الاستخدام', detail: `الذاكرة المستخدمة ${memPct.toFixed(0)}%.` });
    s.advice.push({ id: 'disk-/', severity: 'warning', title: 'مساحة القرص تقترب من الامتلاء: /', detail: 'المتبقي 18% فقط. استخدم صفحة التخزين للتنظيف.' });
    return s;
  };
}

const real = typeof window !== 'undefined' && window.macpulse;

export const isMock = !real;

export const api = real || {
  onTick(cb) { const next = mockSampler(); cb(next()); const id = setInterval(() => cb(next()), 2000); return () => clearInterval(id); },
  getProfile: async () => ({
    model: 'Apple MacBook Pro (تجريبي)', serial: 'MOCK0000', os: 'macOS 15.0 (arm64)', kernel: '24.0.0',
    cpu: { brand: 'Apple M3 Pro', cores: 12, physical: 12, speed: 3.2, max: 4.05 },
    memory: { total: 16 * GB, modules: [{ size: 16 * GB, type: 'LPDDR5', clock: 6400 }] },
    gpus: [{ name: 'Apple M3 Pro GPU', vram: null, cores: 18 }],
    displays: [{ name: 'Liquid Retina XDR', resolution: '3024×1964', refresh: 120 }],
    disks: [{ name: 'APPLE SSD AP0512Z', type: 'SSD', size: 500 * GB, smart: 'Ok' }],
  }),
  scanCleanup: async () => [
    { id: 'user-caches', name: 'ذاكرة التطبيقات المؤقتة (Caches)', dir: '~/Library/Caches', bytes: 4.2 * GB },
    { id: 'xcode-derived', name: 'Xcode DerivedData', dir: '~/Library/Developer/Xcode/DerivedData', bytes: 7.9 * GB },
    { id: 'npm-cache', name: 'npm cache', dir: '~/.npm/_cacache', bytes: 1.3 * GB },
    { id: 'user-logs', name: 'سجلات المستخدم (Logs)', dir: '~/Library/Logs', bytes: 0.2 * GB },
  ],
  runCleanup: async ids => ({ trashed: ids.length * 12, failed: 0, bytes: ids.length * GB }),
  listStartup: async () => mockStartup.map(x => ({ ...x })),
  startupDisable: async f => { mockStartup = mockStartup.map(x => (x.file === f ? { ...x, disabled: true } : x)); return { ok: true }; },
  startupEnable: async f => { mockStartup = mockStartup.map(x => (x.file === f ? { ...x, disabled: false } : x)); return { ok: true }; },
  listLoginItems: async () => ['Dropbox', 'Rectangle', 'Raycast'],
  removeLoginItem: async () => ({ ok: true }),
  sensorsEnable: async () => { mockSensors.active = true; return { ok: true }; },
  sensorsDisable: async () => { mockSensors.active = false; return { ok: true }; },
  history: async range => {
    const n = 120, now = Date.now();
    return Array.from({ length: n }, (_, i) => ({ t: now - (n - i) * (range / n), cpu: 30 + 25 * Math.sin(i / 9) + (i % 7), mem: 55 + 12 * Math.sin(i / 21), temp: 55 + 14 * Math.sin(i / 11), rx: 3e5 + 2e5 * Math.sin(i / 5) ** 2, tx: 8e4, score: 90 - 10 * Math.abs(Math.sin(i / 13)) }));
  },
  exportHistory: async () => ({ ok: true }),
  listActions: async () => [
    { id: 'purge', name: 'تفريغ الذاكرة غير النشطة', note: 'يستدعي purge ويحتاج كلمة مرور المدير' },
    { id: 'flushdns', name: 'مسح ذاكرة DNS', note: 'يفيد عند مشاكل الاتصال بالمواقع' },
    { id: 'dock', name: 'إعادة تشغيل Dock', note: 'يعالج بطء Dock وMission Control' },
    { id: 'finder', name: 'إعادة تشغيل Finder', note: 'يعالج تجمّد Finder' },
  ],
  runAction: async () => ({ ok: true }),
  benchmark: async () => {
    await new Promise(r => setTimeout(r, 800));
    return { ok: true, bench: { cores: 12, cpuSingle: 410, cpuMulti: 3900, memGBs: 38.4, diskWrite: 2650, diskRead: 5100 }, advice: { uses: [
      { name: 'التصفح والمكتب والبريد', level: 'ممتاز', note: 'أي جهاز حديث يكفي لذلك.' },
      { name: 'برمجة وتطوير (IDE + Docker)', level: 'جيد', note: 'الذاكرة تتسع لبيئات تطوير متعددة.' },
      { name: 'نماذج الذكاء الاصطناعي المحلية', level: 'نماذج صغيرة حتى 7B', note: 'الذاكرة الموحدة هي العامل الحاسم.' },
    ], tips: [] } };
  },
  folderSizes: async () => [{ path: '~/Library', name: 'Library', bytes: 61 * GB }, { path: '~/Movies', name: 'Movies', bytes: 38 * GB }, { path: '~/Developer', name: 'Developer', bytes: 22 * GB }, { path: '~/Downloads', name: 'Downloads', bytes: 9 * GB }],
  largeFiles: async () => [{ path: '~/Movies/render.mov', name: 'render.mov', bytes: 8.1 * GB }, { path: '~/Downloads/macOS.dmg', name: 'macOS.dmg', bytes: 13 * GB }],
  trashPath: async () => ({ ok: true }),
  getSettings: async () => mockSettings,
  setSettings: async p => { mockSettings = { ...mockSettings, ...p }; return mockSettings; },
  killProcess: async () => ({ ok: false, error: 'غير متاح في الوضع التجريبي' }),
  reveal: async () => {},
};
