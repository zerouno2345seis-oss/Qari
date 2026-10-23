const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  notifications: true,
  historyEnabled: true,
  cpuAlert: 90, memAlert: 92, tempAlert: 90, diskFreeAlert: 10, batteryAlert: 15,
  sustainSamples: 3,
};
const RANGES = { cpuAlert: [50, 100], memAlert: [50, 100], tempAlert: [60, 110], diskFreeAlert: [1, 50], batteryAlert: [3, 50], sustainSamples: [1, 30] };

function sanitize(input = {}) {
  const out = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS)) {
    if (!(k in input)) continue;
    if (typeof DEFAULTS[k] === 'boolean') out[k] = !!input[k];
    else {
      const n = Number(input[k]);
      if (Number.isFinite(n)) out[k] = Math.min(RANGES[k][1], Math.max(RANGES[k][0], n));
    }
  }
  return out;
}

function createSettings(dir) {
  const file = path.join(dir, 'settings.json');
  let cur = DEFAULTS;
  try { cur = sanitize(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { /* defaults */ }
  return {
    get: () => cur,
    set(patch) {
      cur = sanitize({ ...cur, ...patch });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(cur, null, 2));
      return cur;
    },
  };
}

module.exports = { DEFAULTS, sanitize, createSettings };
