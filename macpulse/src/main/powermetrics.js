// Deep sensors via `powermetrics` (needs root). A background loop is started ONCE through an
// admin prompt; it writes the latest reading to a file the app polls. Stop = create a stop file.
const fs = require('fs');
const path = require('path');
const { runAdmin } = require('./privileged');

const SAFE = /^[\w .\-\/]+$/;

function parse(text) {
  const num = re => { const m = text.match(re); return m ? Number(m[1]) : null; };
  const fans = [...text.matchAll(/Fan[^\n:]*:\s*([\d.]+)\s*rpm/gi)].map(m => Number(m[1]));
  const thermal = text.match(/Current pressure level:\s*(\w+)/i);
  const mw = re => { const v = num(re); return v == null ? null : v / 1000; };
  return {
    dieTemp: num(/CPU die temperature:\s*([\d.]+)\s*C/i),
    gpuTemp: num(/GPU die temperature:\s*([\d.]+)\s*C/i),
    fans,
    thermal: thermal ? thermal[1] : null,
    gpu: { active: num(/GPU HW active residency:\s*([\d.]+)%/i), freqMHz: num(/GPU HW active frequency:\s*([\d.]+)\s*MHz/i) },
    power: {
      cpu: mw(/CPU Power:\s*([\d.]+)\s*mW/i),
      gpu: mw(/GPU Power:\s*([\d.]+)\s*mW/i),
      ane: mw(/ANE Power:\s*([\d.]+)\s*mW/i),
      package: mw(/Combined Power \(CPU \+ GPU \+ ANE\):\s*([\d.]+)\s*mW/i),
    },
  };
}

function buildCommand(dir, appPid) {
  if (!SAFE.test(dir) || !Number.isInteger(appPid)) throw new Error('unsafe helper arguments');
  const loop = `while kill -0 ${appPid} 2>/dev/null && [ ! -e "${dir}/stop" ]; do ` +
    `/usr/bin/powermetrics -n 1 -i 1000 --samplers smc,thermal,gpu_power,cpu_power > "${dir}/pm.tmp" 2>/dev/null ` +
    `&& mv "${dir}/pm.tmp" "${dir}/pm.txt" && chmod 644 "${dir}/pm.txt"; done`;
  return `nohup sh -c '${loop}' >/dev/null 2>&1 &`;
}

function createSensors(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'pm.txt');
  const stop = path.join(dir, 'stop');
  return {
    async enable() {
      if (process.platform !== 'darwin') throw new Error('متاح على macOS فقط');
      try { fs.unlinkSync(stop); } catch { /* none */ }
      await runAdmin(buildCommand(dir, process.pid), 'تفعيل مستشعرات الحرارة والمراوح والـ GPU');
    },
    disable() { fs.writeFileSync(stop, ''); },
    read() {
      try {
        const st = fs.statSync(file);
        if (Date.now() - st.mtimeMs > 8000) return { active: false, stale: true };
        return { active: true, ...parse(fs.readFileSync(file, 'utf8')) };
      } catch { return { active: false }; }
    },
  };
}

module.exports = { parse, buildCommand, createSensors };
