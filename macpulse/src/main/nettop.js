// Per-app network throughput from `nettop` (cumulative bytes; we diff between polls).
const { execFile } = require('child_process');

function parse(text) {
  const lines = text.split('\n').filter(Boolean);
  const hi = lines.findIndex(l => l.includes('bytes_in'));
  if (hi < 0) return {};
  const cols = lines[hi].split(',').map(c => c.trim());
  const iIn = cols.indexOf('bytes_in'), iOut = cols.indexOf('bytes_out');
  const out = {};
  for (const l of lines.slice(hi + 1)) {
    const c = l.split(',');
    const m = (c[0] || '').match(/^(.*)\.(\d+)$/);
    if (!m) continue;
    const rx = Number(c[iIn]), tx = Number(c[iOut]);
    if (isNaN(rx) || isNaN(tx)) continue;
    out[m[2]] = { name: m[1], pid: Number(m[2]), rx, tx };
  }
  return out;
}

function createNetPoller() {
  let prev = null, prevT = 0;
  return () => new Promise(resolve => {
    if (process.platform !== 'darwin') return resolve([]);
    execFile('nettop', ['-P', '-L', '1', '-x', '-J', 'bytes_in,bytes_out'], { timeout: 5000, maxBuffer: 4e6 }, (err, stdout) => {
      if (err) return resolve([]);
      const cur = parse(stdout), now = Date.now();
      const rows = [];
      if (prev) {
        const dt = Math.max(0.5, (now - prevT) / 1000);
        for (const [pid, p] of Object.entries(cur)) {
          const q = prev[pid];
          if (!q) continue;
          const rx = Math.max(0, (p.rx - q.rx) / dt), tx = Math.max(0, (p.tx - q.tx) / dt);
          if (rx + tx > 0) rows.push({ name: p.name, pid: p.pid, rx, tx });
        }
      }
      prev = cur; prevT = now;
      resolve(rows.sort((a, b) => b.rx + b.tx - (a.rx + a.tx)).slice(0, 8));
    });
  });
}

module.exports = { parse, createNetPoller };
