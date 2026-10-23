// Launch agents/daemons: list, disable (reversible move to a ".disabled" sibling folder) and re-enable.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { runAdmin, esc } = require('./privileged');

const SAFE = /^[\w .\-\/]+$/;
const DIRS = [
  { dir: path.join(os.homedir(), 'Library/LaunchAgents'), scope: 'المستخدم', domain: 'gui', admin: false },
  { dir: '/Library/LaunchAgents', scope: 'كل المستخدمين', domain: 'gui', admin: true },
  { dir: '/Library/LaunchDaemons', scope: 'النظام (خدمة)', domain: 'system', admin: true },
];

function readItem(file, scope, disabled) {
  let label = path.basename(file).replace(/\.plist$/, '');
  let runAtLoad = null;
  try {
    const xml = fs.readFileSync(file, 'utf8');
    const m = xml.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
    if (m) label = m[1];
    runAtLoad = /<key>RunAtLoad<\/key>\s*<true\s*\/>/.test(xml);
  } catch { /* binary plist: keep filename */ }
  return { label, file, scope, runAtLoad, disabled };
}

function list() {
  const items = [];
  for (const { dir, scope } of DIRS) {
    for (const [d, disabled] of [[dir, false], [`${dir}.disabled`, true]]) {
      let files = [];
      try { files = fs.readdirSync(d).filter(f => f.endsWith('.plist')); } catch { continue; }
      for (const f of files) items.push(readItem(path.join(d, f), scope, disabled));
    }
  }
  return items;
}

// Validates a path against the known folders and returns what to do with it.
function plan(file, action) {
  if (typeof file !== 'string' || !SAFE.test(file) || !file.endsWith('.plist') || file.includes('..')) throw new Error('مسار غير صالح');
  const dir = path.dirname(file);
  const home = DIRS.find(d => (action === 'disable' ? d.dir : `${d.dir}.disabled`) === dir);
  if (!home) throw new Error('الملف خارج المجلدات المسموحة');
  const from = file;
  const toDir = action === 'disable' ? `${home.dir}.disabled` : home.dir;
  return { from, toDir, to: path.join(toDir, path.basename(file)), admin: home.admin, domain: home.domain };
}

const sh = (cmd, args) => new Promise(res => execFile(cmd, args, { timeout: 15000 }, () => res()));

async function move(file, action) {
  const p = plan(file, action);
  const uid = process.getuid ? process.getuid() : 501;
  const target = p.domain === 'system' ? 'system' : `gui/${uid}`;
  if (p.admin) {
    const unload = action === 'disable' ? `launchctl bootout ${target} "${p.from}" 2>/dev/null; ` : '';
    const load = action === 'enable' ? `; launchctl bootstrap ${target} "${p.to}" 2>/dev/null || true` : '';
    await runAdmin(`${unload}mkdir -p "${p.toDir}" && mv "${p.from}" "${p.to}"${load}`, action === 'disable' ? 'تعطيل عنصر بدء التشغيل' : 'إعادة تفعيل عنصر بدء التشغيل');
  } else {
    if (action === 'disable') await sh('launchctl', ['bootout', target, p.from]);
    fs.mkdirSync(p.toDir, { recursive: true });
    fs.renameSync(p.from, p.to);
    if (action === 'enable') await sh('launchctl', ['bootstrap', target, p.to]);
  }
  return { ok: true };
}

const osa = script => new Promise((resolve, reject) =>
  execFile('/usr/bin/osascript', ['-e', script], { timeout: 15000 }, (e, out, err) => (e ? reject(new Error(err.trim() || e.message)) : resolve(out.trim()))));

async function listLoginItems() {
  if (process.platform !== 'darwin') return [];
  const out = await osa('tell application "System Events" to get the name of every login item').catch(() => '');
  return out ? out.split(', ').map(n => n.trim()).filter(Boolean) : [];
}

async function removeLoginItem(name) {
  const items = await listLoginItems();
  if (!items.includes(name)) throw new Error('العنصر غير موجود');
  await osa(`tell application "System Events" to delete login item "${esc(name)}"`);
  return { ok: true };
}

module.exports = { list, plan, disable: f => move(f, 'disable'), enable: f => move(f, 'enable'), listLoginItems, removeLoginItem };
