// Turns hardware profile (+ optional benchmark) into plain advice on what the machine is good for.
const GB = 1024 ** 3;

function assess(profile, bench) {
  const ram = profile.memory.total / GB;
  const cores = profile.cpu.cores;
  const uses = [];
  const add = (name, level, note) => uses.push({ name, level, note });

  add('التصفح والمكتب والبريد', 'ممتاز', 'أي جهاز حديث يكفي لذلك.');
  add('برمجة وتطوير (IDE + Docker)', ram >= 16 && cores >= 8 ? 'ممتاز' : ram >= 8 ? 'جيد' : 'محدود',
    ram >= 16 ? 'الذاكرة تتسع لبيئات تطوير متعددة.' : 'ذاكرة أقل من 16GB تضغط عند تشغيل Docker وIDE معًا.');
  add('مونتاج فيديو 4K', ram >= 32 && cores >= 10 ? 'ممتاز' : ram >= 16 ? 'جيد' : 'محدود', 'يحتاج ذاكرة ومعالجة رسومية قوية، ويُفضّل قرص سريع للمشاريع.');
  add('الآلات الافتراضية', ram >= 32 ? 'ممتاز' : ram >= 16 ? 'جيد لآلة واحدة' : 'محدود', 'خصّص للآلة الافتراضية نصف الذاكرة كحد أقصى.');
  add('نماذج الذكاء الاصطناعي المحلية', ram >= 64 ? 'نماذج كبيرة' : ram >= 32 ? 'نماذج متوسطة' : ram >= 16 ? 'نماذج صغيرة حتى 7B' : 'محدود جدًا', 'الذاكرة الموحدة هي العامل الحاسم.');

  const tips = [];
  if (ram < 16) tips.push('الترقية أو إغلاق التبويبات والتطبيقات الثقيلة هما أكبر تحسين متاح لك.');
  if (bench) {
    if (bench.diskWrite < 500) tips.push(`سرعة كتابة القرص ${bench.diskWrite.toFixed(0)} MB/s منخفضة؛ قد يكون القرص ممتلئًا أو بطيئًا.`);
    if (bench.cpuMulti / bench.cpuSingle < cores * 0.5) tips.push('أداء الأنوية المتعددة أقل من المتوقع؛ ربما كانت هناك عمليات تعمل أثناء الاختبار أو أن الجهاز يخفّض سرعته بسبب الحرارة.');
  }
  return { uses, tips };
}

module.exports = { assess };
