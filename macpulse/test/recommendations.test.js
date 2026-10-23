const test = require('node:test');
const assert = require('node:assert');
const { evaluate, healthScore } = require('../src/main/recommendations');

const GB = 1024 ** 3;
const base = () => ({
  cpu: { load: 20 },
  mem: { total: 16 * GB, used: 6 * GB, swapUsed: 0, pressure: 'normal' },
  temp: { cpu: 50 },
  battery: { hasBattery: true, health: 95, cycles: 100 },
  disks: [{ mount: '/', usePct: 40 }],
  top: [{ name: 'Safari', cpu: 10 }],
});

test('healthy machine yields no advice and a high score', () => {
  assert.deepStrictEqual(evaluate(base()), []);
  assert.ok(healthScore(base()) >= 95);
});

test('critical items are sorted before warnings', () => {
  const s = base();
  s.cpu.load = 95;
  s.temp.cpu = 88;
  const r = evaluate(s);
  assert.strictEqual(r[0].id, 'cpu-high');
  assert.strictEqual(r[0].severity, 'critical');
  assert.ok(r.some(x => x.id === 'temp-high'));
});

test('memory pressure and swap are flagged', () => {
  const s = base();
  s.mem.used = 15.5 * GB;
  s.mem.swapUsed = 3 * GB;
  const ids = evaluate(s).map(x => x.id);
  assert.ok(ids.includes('mem-critical'));
  assert.ok(ids.includes('swap-high'));
});

test('low disk space and weak battery are flagged', () => {
  const s = base();
  s.disks = [{ mount: '/', usePct: 96 }];
  s.battery.health = 70;
  const r = evaluate(s);
  assert.strictEqual(r.find(x => x.id === 'disk-/').severity, 'critical');
  assert.ok(r.some(x => x.id === 'batt-health'));
});

test('score drops under heavy load', () => {
  const s = base();
  s.cpu.load = 100;
  s.temp.cpu = 100;
  assert.ok(healthScore(s) < 60);
});
