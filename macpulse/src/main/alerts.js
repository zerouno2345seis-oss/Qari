// Sustained-threshold alerts with per-rule cooldown. Pure: returns notifications, caller shows them.
function createAlerts(getSettings, cooldownMs = 10 * 60 * 1000) {
  const streak = {};
  const last = {};
  return function check(s, now = Date.now()) {
    const cfg = getSettings();
    if (!cfg.notifications) return [];
    const memPct = (s.mem.used / s.mem.total) * 100;
    const conds = [
      ['cpu', s.cpu.load >= cfg.cpuAlert, 'المعالج مرتفع', `الحِمل ${s.cpu.load.toFixed(0)}% منذ فترة${s.top[0] ? ` — ${s.top[0].name}` : ''}`],
      ['mem', memPct >= cfg.memAlert, 'الذاكرة ممتلئة تقريبًا', `الاستخدام ${memPct.toFixed(0)}%`],
      ['temp', (s.sensors?.dieTemp ?? s.temp.cpu ?? 0) >= cfg.tempAlert, 'حرارة مرتفعة', `${(s.sensors?.dieTemp ?? s.temp.cpu)?.toFixed?.(0)}°C`],
      ['disk', s.disks.some(d => 100 - d.usePct <= cfg.diskFreeAlert), 'مساحة القرص قليلة', 'افتح صفحة التخزين للتنظيف'],
      ['batt', s.battery.hasBattery && !s.battery.charging && s.battery.percent <= cfg.batteryAlert, 'البطارية منخفضة', `${s.battery.percent}%`],
    ];
    const out = [];
    for (const [id, on, title, body] of conds) {
      streak[id] = on ? (streak[id] || 0) + 1 : 0;
      if (streak[id] >= cfg.sustainSamples && now - (last[id] || 0) >= cooldownMs) {
        last[id] = now;
        out.push({ id, title, body });
      }
    }
    return out;
  };
}

module.exports = { createAlerts };
