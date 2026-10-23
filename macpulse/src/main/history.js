// Compact time-series store (JSON lines, 24h retention, downsampled queries) + CSV export.
const fs = require('fs');
const path = require('path');

const KEEP_MS = 24 * 3600 * 1000;

function createHistory(dir, intervalMs = 10000) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'history.jsonl');
  let rows = [];
  let lastT = 0;
  try {
    rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => Date.now() - r.t < KEEP_MS);
  } catch { rows = []; }
  if (rows.length) lastT = rows[rows.length - 1].t;
  let appended = 0;

  return {
    record(s) {
      if (s.t - lastT < intervalMs) return false;
      lastT = s.t;
      const r = {
        t: s.t, cpu: +s.cpu.load.toFixed(1), mem: +((s.mem.used / s.mem.total) * 100).toFixed(1),
        temp: s.sensors?.dieTemp ?? s.temp.cpu ?? null, rx: Math.round(s.net.rx), tx: Math.round(s.net.tx),
        gpu: s.sensors?.gpu?.active ?? null, power: s.sensors?.power?.package ?? null, score: s.score,
      };
      rows.push(r);
      fs.appendFileSync(file, JSON.stringify(r) + '\n');
      if (++appended % 500 === 0) {
        rows = rows.filter(x => s.t - x.t < KEEP_MS);
        fs.writeFileSync(file, rows.map(x => JSON.stringify(x)).join('\n') + '\n');
      }
      return true;
    },
    query(rangeMs, maxPoints = 240, now = Date.now()) {
      const sel = rows.filter(r => now - r.t <= rangeMs);
      if (sel.length <= maxPoints) return sel;
      const step = sel.length / maxPoints;
      return Array.from({ length: maxPoints }, (_, i) => sel[Math.floor(i * step)]);
    },
    toCsv() {
      const h = ['time', 'cpu', 'mem', 'temp', 'rx', 'tx', 'gpu', 'power', 'score'];
      return [h.join(','), ...rows.map(r => [new Date(r.t).toISOString(), r.cpu, r.mem, r.temp ?? '', r.rx, r.tx, r.gpu ?? '', r.power ?? '', r.score].join(','))].join('\n');
    },
    size: () => rows.length,
  };
}

module.exports = { createHistory };
