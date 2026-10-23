// Pure rules engine: turns a metrics snapshot into prioritised advice.
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

function evaluate(s, ctx = {}) {
  const out = [];
  const add = (id, severity, title, detail) => out.push({ id, severity, title, detail });

  const topCpu = s.top && s.top[0];
  if (s.cpu.load > 85) {
    add('cpu-high', 'critical', 'حِمل المعالج مرتفع جدًا',
      `المعالج عند ${s.cpu.load.toFixed(0)}%` + (topCpu ? `، وأكبر مستهلك: ${topCpu.name} (${topCpu.cpu.toFixed(0)}%)` : ''));
  } else if (topCpu && topCpu.cpu > 60) {
    add('cpu-proc', 'warning', `عملية تستهلك المعالج: ${topCpu.name}`,
      `تستهلك ${topCpu.cpu.toFixed(0)}% من نواة واحدة أو أكثر. فكّر في إغلاقها أو إعادة تشغيلها.`);
  }

  const memPct = (s.mem.used / s.mem.total) * 100;
  if (s.mem.pressure === 'critical' || memPct > 92) {
    add('mem-critical', 'critical', 'ضغط الذاكرة حرج', `الذاكرة المستخدمة ${memPct.toFixed(0)}%. أغلق التطبيقات الثقيلة.`);
  } else if (s.mem.pressure === 'warn' || memPct > 80) {
    add('mem-high', 'warning', 'الذاكرة مرتفعة الاستخدام', `الذاكرة المستخدمة ${memPct.toFixed(0)}%.`);
  }
  if (s.mem.swapUsed > 2 * 1024 ** 3) {
    add('swap-high', 'warning', 'استخدام كبير لذاكرة التبديل (Swap)',
      'النظام يكتب إلى القرص بدل الذاكرة، وهذا يبطئ الجهاز ويستهلك عمر الـ SSD.');
  }

  if (s.temp && s.temp.cpu != null) {
    if (s.temp.cpu >= 95) add('temp-critical', 'critical', 'حرارة المعالج خطرة', `${s.temp.cpu.toFixed(0)}°C. تأكد من التهوية وأوقف الأعمال الثقيلة.`);
    else if (s.temp.cpu >= 85) add('temp-high', 'warning', 'حرارة المعالج مرتفعة', `${s.temp.cpu.toFixed(0)}°C، وقد يتباطأ المعالج تلقائيًا (Thermal Throttling).`);
  }

  const th = s.sensors && s.sensors.thermal;
  if (th && !/nominal/i.test(th)) {
    add('thermal-pressure', /heavy|critical|trapping|sleeping/i.test(th) ? 'critical' : 'warning', 'ضغط حراري على النظام',
      `مستوى الضغط الحراري: ${th}. يخفّض النظام سرعة المعالج للحفاظ على الحرارة؛ حسّن التهوية وأغلق الأعمال الثقيلة.`);
  }
  if (s.sensors && s.sensors.fans && s.sensors.fans.some(f => f > 5500)) {
    add('fan-max', 'info', 'المراوح تعمل بسرعة عالية', `${Math.max(...s.sensors.fans)} RPM، وهذا يدل على حِمل حراري مستمر.`);
  }

  const b = s.battery;
  if (b && b.hasBattery) {
    if (b.health != null && b.health < 80) add('batt-health', 'warning', 'صحة البطارية منخفضة', `السعة الحالية ${b.health.toFixed(0)}% من التصميم الأصلي. فكّر في استبدالها.`);
    if (b.cycles != null && b.cycles > 1000) add('batt-cycles', 'info', 'عدد دورات البطارية مرتفع', `${b.cycles} دورة شحن.`);
  }

  for (const d of s.disks || []) {
    const freePct = 100 - d.usePct;
    if (freePct < 10) add(`disk-${d.mount}`, freePct < 5 ? 'critical' : 'warning', `مساحة القرص قليلة: ${d.mount}`, `المتبقي ${freePct.toFixed(0)}% فقط. استخدم صفحة التخزين لتنظيف الملفات المؤقتة.`);
  }

  if (ctx.startupCount > 15) {
    add('startup-many', 'info', 'عناصر كثيرة تعمل عند بدء التشغيل', `${ctx.startupCount} عنصرًا. راجع صفحة بدء التشغيل وأزل غير الضروري.`);
  }
  if (ctx.cleanableBytes > 5 * 1024 ** 3) {
    add('clean-available', 'info', 'يمكن تحرير مساحة بالتنظيف', `ملفات مؤقتة قابلة للتنظيف تقارب ${(ctx.cleanableBytes / 1024 ** 3).toFixed(1)} GB.`);
  }

  return out.sort((a, b2) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b2.severity]);
}

// 0-100 overall health score (higher is better).
function healthScore(s) {
  const memPct = (s.mem.used / s.mem.total) * 100;
  let score = 100;
  score -= Math.max(0, s.cpu.load - 50) * 0.5;
  score -= Math.max(0, memPct - 60) * 0.6;
  if (s.temp && s.temp.cpu != null) score -= Math.max(0, s.temp.cpu - 70) * 0.8;
  if (s.mem.swapUsed > 1024 ** 3) score -= 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

module.exports = { evaluate, healthScore };
