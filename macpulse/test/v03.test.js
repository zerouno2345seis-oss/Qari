const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const pm = require('../src/main/powermetrics');
const nettop = require('../src/main/nettop');
const { groupByApp, appName } = require('../src/main/groups');
const { sanitize, createSettings, DEFAULTS } = require('../src/main/settings');
const { createAlerts } = require('../src/main/alerts');
const { createHistory } = require('../src/main/history');
const startup = require('../src/main/startup');
const { assess } = require('../src/main/capabilities');
const { cpuWork } = require('../src/main/benchmark');

const GB = 1024 ** 3;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mp-'));

// NOTE: fixtures are hand-written from the documented powermetrics/nettop layouts, not captured from a real Mac.
test('powermetrics parser extracts temps, fans, power and thermal pressure', () => {
  const r = pm.parse(`
**** SMC sensors ****
CPU die temperature: 52.03 C
Fan: 2103 rpm
**** Thermal pressure ****
Current pressure level: Moderate
**** GPU usage ****
GPU HW active frequency: 444 MHz
GPU HW active residency:   5.50% (444 MHz: 5.5%)
CPU Power: 1350 mW
GPU Power: 120 mW
ANE Power: 0 mW
Combined Power (CPU + GPU + ANE): 1470 mW
`);
  assert.strictEqual(r.dieTemp, 52.03);
  assert.deepStrictEqual(r.fans, [2103]);
  assert.strictEqual(r.thermal, 'Moderate');
  assert.strictEqual(r.gpu.active, 5.5);
  assert.strictEqual(r.power.package, 1.47);
});

test('powermetrics parser tolerates missing sections', () => {
  const r = pm.parse('nothing useful');
  assert.strictEqual(r.dieTemp, null);
  assert.deepStrictEqual(r.fans, []);
});

test('helper command rejects unsafe directories and quotes safely', () => {
  assert.throws(() => pm.buildCommand('/tmp/a"; rm -rf /', 1));
  assert.throws(() => pm.buildCommand("/tmp/a'b", 1));
  const c = pm.buildCommand('/Users/x/Library/Application Support/MacPulse/sensors', 123);
  assert.ok(c.includes('kill -0 123') && c.includes('powermetrics'));
});

test('nettop parser is header driven', () => {
  const r = nettop.parse(',bytes_in,bytes_out,\nGoogle Chrome H.321,1000,200,\nSafari.55,50,60,\nbad line\n');
  assert.strictEqual(r['321'].name, 'Google Chrome H');
  assert.strictEqual(r['55'].tx, 60);
});

test('process grouping merges helpers under the app', () => {
  assert.strictEqual(appName('Google Chrome Helper (Renderer)'), 'Google Chrome');
  const g = groupByApp([
    { name: 'Google Chrome', cpu: 10, memBytes: 100, pid: 1 },
    { name: 'Google Chrome Helper', cpu: 30, memBytes: 200, pid: 2 },
    { name: 'Finder', cpu: 5, memBytes: 50, pid: 3 },
  ]);
  assert.strictEqual(g[0].name, 'Google Chrome');
  assert.strictEqual(g[0].cpu, 40);
  assert.strictEqual(g[0].count, 2);
});

test('settings are clamped and persisted', () => {
  assert.strictEqual(sanitize({ cpuAlert: 5 }).cpuAlert, 50);
  assert.strictEqual(sanitize({ evil: 1 }).evil, undefined);
  const dir = tmp();
  const s = createSettings(dir);
  s.set({ memAlert: 77, notifications: false });
  const again = createSettings(dir).get();
  assert.strictEqual(again.memAlert, 77);
  assert.strictEqual(again.notifications, false);
});

const snap = (o = {}) => ({
  t: Date.now(), cpu: { load: 95 }, mem: { total: 16 * GB, used: 4 * GB }, temp: { cpu: 40 },
  disks: [{ usePct: 50 }], battery: { hasBattery: false }, top: [{ name: 'node' }], net: { rx: 0, tx: 0 }, score: 90, ...o,
});

test('alerts need sustained load and respect cooldown', () => {
  const check = createAlerts(() => ({ ...DEFAULTS, sustainSamples: 3 }), 1000);
  const T = 1e9;
  assert.strictEqual(check(snap(), T).length, 0);
  assert.strictEqual(check(snap(), T + 1).length, 0);
  assert.strictEqual(check(snap(), T + 2).map(a => a.id)[0], 'cpu');
  assert.strictEqual(check(snap(), T + 3).length, 0);
  assert.strictEqual(check(snap(), T + 2000).length, 1);
});

test('alerts are silent when disabled', () => {
  const check = createAlerts(() => ({ ...DEFAULTS, notifications: false, sustainSamples: 1 }));
  assert.deepStrictEqual(check(snap()), []);
});

test('history records at interval, queries by range, exports CSV and reloads', () => {
  const dir = tmp();
  const h = createHistory(dir, 10000);
  const t0 = Date.now() - 60000;
  for (let i = 0; i < 6; i++) h.record(snap({ t: t0 + i * 10000 }));
  assert.strictEqual(h.record(snap({ t: t0 + 50001 })), false);
  assert.strictEqual(h.size(), 6);
  assert.strictEqual(h.query(3600000).length, 6);
  assert.strictEqual(h.query(3600000, 3).length, 3);
  assert.strictEqual(h.toCsv().split('\n').length, 7);
  assert.strictEqual(createHistory(dir).size(), 6);
});

test('startup plan only accepts known launch folders', () => {
  const home = os.homedir();
  const ok = startup.plan(`${home}/Library/LaunchAgents/com.x.plist`, 'disable');
  assert.strictEqual(ok.toDir, `${home}/Library/LaunchAgents.disabled`);
  assert.strictEqual(ok.admin, false);
  const sys = startup.plan('/Library/LaunchDaemons/com.y.plist', 'disable');
  assert.strictEqual(sys.admin, true);
  assert.throws(() => startup.plan('/etc/passwd', 'disable'));
  assert.throws(() => startup.plan('/Library/LaunchDaemons/../../etc/x.plist', 'disable'));
  assert.throws(() => startup.plan('/Library/LaunchDaemons/a"b.plist', 'disable'));
  assert.throws(() => startup.plan('/Library/LaunchDaemons/com.y.plist', 'enable'));
  const re = startup.plan('/Library/LaunchDaemons.disabled/com.y.plist', 'enable');
  assert.strictEqual(re.to, '/Library/LaunchDaemons/com.y.plist');
});

test('capability assessment scales with RAM', () => {
  const small = assess({ memory: { total: 8 * GB }, cpu: { cores: 8 } });
  const big = assess({ memory: { total: 64 * GB }, cpu: { cores: 12 } });
  const ai = r => r.uses.find(u => u.name.includes('الذكاء')).level;
  assert.notStrictEqual(ai(small), ai(big));
  assert.ok(small.tips.length > 0);
});

test('cpu benchmark kernel returns a positive rate', () => {
  assert.ok(cpuWork(100) > 0);
});
