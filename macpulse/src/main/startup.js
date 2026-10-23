// Lists launch agents/daemons. Read-only: the UI offers "reveal in Finder", never silent changes.
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIRS = [
  { dir: path.join(os.homedir(), 'Library/LaunchAgents'), scope: 'المستخدم' },
  { dir: '/Library/LaunchAgents', scope: 'كل المستخدمين' },
  { dir: '/Library/LaunchDaemons', scope: 'النظام (خدمة)' },
];

function list() {
  const items = [];
  for (const { dir, scope } of DIRS) {
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => f.endsWith('.plist')); } catch { continue; }
    for (const f of files) {
      const file = path.join(dir, f);
      let label = f.replace(/\.plist$/, '');
      let runAtLoad = null;
      try {
        const xml = fs.readFileSync(file, 'utf8');
        const m = xml.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
        if (m) label = m[1];
        runAtLoad = /<key>RunAtLoad<\/key>\s*<true\s*\/>/.test(xml);
      } catch { /* binary plist: keep filename as label */ }
      items.push({ label, file, scope, runAtLoad });
    }
  }
  return items;
}

module.exports = { list };
