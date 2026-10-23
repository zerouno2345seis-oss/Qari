// Uses the Electron bridge when present; otherwise a mock feed so the UI can be developed in a browser.
const GB = 1024 ** 3;

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
  listStartup: async () => [
    { label: 'com.spotify.webhelper', file: '~/Library/LaunchAgents/com.spotify.webhelper.plist', scope: 'المستخدم', runAtLoad: true },
    { label: 'com.docker.helper', file: '/Library/LaunchDaemons/com.docker.vmnetd.plist', scope: 'النظام (خدمة)', runAtLoad: true },
    { label: 'com.adobe.AdobeCreativeCloud', file: '/Library/LaunchAgents/com.adobe.acc.plist', scope: 'كل المستخدمين', runAtLoad: true },
  ],
  killProcess: async () => ({ ok: false, error: 'غير متاح في الوضع التجريبي' }),
  reveal: async () => {},
};
