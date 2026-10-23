const si = require('systeminformation');
const { execFile } = require('child_process');
const { evaluate, healthScore } = require('./recommendations');

const run = (cmd, args) => new Promise(res =>
  execFile(cmd, args, { timeout: 4000 }, (err, stdout) => res(err ? '' : stdout)));

// macOS memory pressure: parses the free percentage printed by `memory_pressure`.
async function memoryPressure() {
  if (process.platform !== 'darwin') return 'normal';
  const out = await run('memory_pressure', ['-Q']);
  const m = out.match(/free percentage:\s*(\d+)%/);
  if (!m) return 'normal';
  const free = Number(m[1]);
  return free < 10 ? 'critical' : free < 25 ? 'warn' : 'normal';
}

async function sample(ctx = {}) {
  const [load, mem, temp, battery, procs, fs, net, io, pressure] = await Promise.all([
    si.currentLoad(), si.mem(), si.cpuTemperature(), si.battery(),
    si.processes(), si.fsSize(), si.networkStats(), si.disksIO().catch(() => null),
    memoryPressure(),
  ]);

  const top = [...procs.list]
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 60)
    .map(p => ({ pid: p.pid, name: p.name, cpu: p.cpu, memPct: p.mem, memBytes: (p.memRss || 0) * 1024, user: p.user }));

  const snapshot = {
    t: Date.now(),
    cpu: { load: load.currentLoad, user: load.currentLoadUser, system: load.currentLoadSystem, cores: load.cpus.map(c => c.load) },
    mem: {
      total: mem.total, used: mem.active, free: mem.available, swapUsed: mem.swapused, swapTotal: mem.swaptotal,
      wired: mem.buffcache, pressure,
    },
    temp: { cpu: temp.main ?? null, cores: temp.cores || [] },
    battery: {
      hasBattery: battery.hasBattery, percent: battery.percent, charging: battery.isCharging,
      cycles: battery.cycleCount ?? null,
      health: battery.maxCapacity && battery.designedCapacity ? (battery.maxCapacity / battery.designedCapacity) * 100 : null,
      timeRemaining: battery.timeRemaining ?? null,
    },
    net: { rx: net.reduce((a, n) => a + (n.rx_sec || 0), 0), tx: net.reduce((a, n) => a + (n.tx_sec || 0), 0) },
    io: io ? { read: io.rIO_sec || 0, write: io.wIO_sec || 0 } : null,
    disks: fs.filter(d => d.size > 0).map(d => ({ mount: d.mount, fs: d.fs, size: d.size, used: d.used, usePct: d.use })),
    processCount: procs.all,
    top,
    sensors: ctx.sensors || null,
    netApps: ctx.netApps || [],
  };
  if (snapshot.sensors?.dieTemp != null) snapshot.temp.cpu = snapshot.sensors.dieTemp;
  snapshot.score = healthScore(snapshot);
  snapshot.advice = evaluate(snapshot, ctx);
  return snapshot;
}

module.exports = { sample };
