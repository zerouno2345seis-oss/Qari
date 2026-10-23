const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const home = os.homedir();

const run = (cmd, args, opts = {}) => new Promise(res =>
  execFile(cmd, args, { timeout: 90000, maxBuffer: 32e6, ...opts }, (err, out) => res(err && !out ? '' : out)));

async function folderSizes() {
  const out = await run('du', ['-k', '-d', '1', home]);
  return out.split('\n').filter(Boolean).map(l => {
    const [kb, p] = l.split('\t');
    return { path: p, name: path.basename(p), bytes: Number(kb) * 1024 };
  }).filter(r => r.path !== home).sort((a, b) => b.bytes - a.bytes).slice(0, 12);
}

async function largeFiles(minMB = 500) {
  const mb = Math.max(50, Math.min(10000, Math.floor(Number(minMB) || 500)));
  const out = await run('find', [home, '-xdev', '-type', 'f', '-size', `+${mb}M`, '-not', '-path', `${home}/.Trash/*`]);
  const files = [];
  for (const p of out.split('\n').filter(Boolean).slice(0, 400)) {
    try { files.push({ path: p, name: path.basename(p), bytes: fs.statSync(p).size }); } catch { /* vanished */ }
  }
  return files.sort((a, b) => b.bytes - a.bytes).slice(0, 40);
}

function insideHome(p) {
  try {
    const real = fs.realpathSync(p);
    const rel = path.relative(fs.realpathSync(home), real);
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  } catch { return false; }
}

module.exports = { folderSizes, largeFiles, insideHome };
