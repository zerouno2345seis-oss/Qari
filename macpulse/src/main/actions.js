// Whitelisted one-click maintenance actions. Renderer sends an id only, never a command.
const { execFile } = require('child_process');
const { runAdmin } = require('./privileged');

const user = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, { timeout: 20000 }, e => (e ? rej(e) : res())));

const ACTIONS = {
  purge: { name: 'تفريغ الذاكرة غير النشطة', note: 'يستدعي purge ويحتاج كلمة مرور المدير', run: () => runAdmin('/usr/sbin/purge', 'تفريغ الذاكرة غير النشطة') },
  flushdns: { name: 'مسح ذاكرة DNS', note: 'يفيد عند مشاكل الاتصال بالمواقع', run: () => runAdmin('/usr/bin/dscacheutil -flushcache; /usr/bin/killall -HUP mDNSResponder', 'مسح DNS') },
  dock: { name: 'إعادة تشغيل Dock', note: 'يعالج بطء Dock وMission Control', run: () => user('/usr/bin/killall', ['Dock']) },
  finder: { name: 'إعادة تشغيل Finder', note: 'يعالج تجمّد Finder', run: () => user('/usr/bin/killall', ['Finder']) },
  spotlight: { name: 'إعادة فهرسة Spotlight', note: 'يعالج البحث البطيء؛ يعمل الفهرس في الخلفية', run: () => runAdmin('/usr/bin/mdutil -E /', 'إعادة فهرسة Spotlight') },
};

const list = () => Object.entries(ACTIONS).map(([id, a]) => ({ id, name: a.name, note: a.note }));

async function run(id) {
  const a = ACTIONS[id];
  if (!a) throw new Error('إجراء غير معروف');
  await a.run();
  return { ok: true, name: a.name };
}

module.exports = { list, run, ACTIONS };
