// Safe cleaner: only whitelisted roots, only their immediate children, moved to Trash (never rm).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const home = os.homedir();
const TARGETS = [
  { id: 'user-caches', name: 'ذاكرة التطبيقات المؤقتة (Caches)', dir: path.join(home, 'Library/Caches') },
  { id: 'user-logs', name: 'سجلات المستخدم (Logs)', dir: path.join(home, 'Library/Logs') },
  { id: 'xcode-derived', name: 'Xcode DerivedData', dir: path.join(home, 'Library/Developer/Xcode/DerivedData') },
  { id: 'xcode-archives-sim', name: 'محاكيات Xcode غير المتاحة', dir: path.join(home, 'Library/Developer/CoreSimulator/Caches') },
  { id: 'npm-cache', name: 'npm cache', dir: path.join(home, '.npm/_cacache') },
  { id: 'brew-cache', name: 'Homebrew cache', dir: path.join(home, 'Library/Caches/Homebrew') },
  { id: 'trash', name: 'سلة المحذوفات', dir: path.join(home, '.Trash') },
];

const duKb = dir => new Promise(res =>
  execFile('du', ['-sk', dir], { timeout: 60000 }, (err, out) => res(err ? 0 : Number(out.split('\t')[0]) * 1024)));

async function scan() {
  const rows = [];
  for (const t of TARGETS) {
    if (!fs.existsSync(t.dir)) continue;
    rows.push({ id: t.id, name: t.name, dir: t.dir, bytes: await duKb(t.dir) });
  }
  return rows;
}

function insideRoot(root, p) {
  try {
    const rel = path.relative(fs.realpathSync(root), fs.realpathSync(path.dirname(p)));
    return !rel.startsWith('..') && !path.isAbsolute(rel);
  } catch { return false; }
}

// `trash` is injected (electron's shell.trashItem) so this stays testable.
async function clean(ids, trash) {
  const result = { trashed: 0, failed: 0, bytes: 0 };
  for (const t of TARGETS.filter(x => ids.includes(x.id))) {
    if (!fs.existsSync(t.dir)) continue;
    for (const name of fs.readdirSync(t.dir)) {
      const p = path.join(t.dir, name);
      if (!insideRoot(t.dir, p) || fs.lstatSync(p).isSymbolicLink()) { result.failed++; continue; }
      try {
        const size = await duKb(p);
        await trash(p);
        result.trashed++;
        result.bytes += size;
      } catch { result.failed++; }
    }
  }
  return result;
}

module.exports = { scan, clean, TARGETS };
