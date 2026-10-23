# MacPulse

تطبيق Electron + React لمراقبة أداء macOS وتحليل العتاد وتنظيف النظام. الخطة في [PROPOSAL.md](PROPOSAL.md).

## الطريقة 1: ملف جاهز (الأسهل)

1. افتح صفحة **Releases** في المستودع، ونزّل `MacPulse-…-arm64.dmg` (أجهزة M1/M2/M3/M4) أو `…-x64.dmg` (أجهزة Intel).
2. افتح الـ dmg واسحب MacPulse إلى **Applications** (لا تشغّله من داخل الـ dmg).
3. التطبيق غير موقّع من Apple (موقّع محليًا فقط)، فيحجبه macOS بعد التنزيل من الإنترنت. نفّذ مرة واحدة في الطرفية:

```bash
xattr -cr /Applications/MacPulse.app
```

ثم افتحه من Applications. إن بقي محجوبًا: بزر أيمن على التطبيق ← Open، أو إعدادات النظام ← الخصوصية والأمان ← «فتح على أي حال».

## الطريقة 2: من الشيفرة بنقرتين

بعد نسخ المستودع: افتح مجلد `macpulse` في Finder وانقر مرتين على **Launch MacPulse.command**. يثبّت المتطلبات في أول مرة ثم يفتح التطبيق. (إن منع macOS الملف: بزر أيمن ← Open.)

أو من الطرفية:

```bash
git clone https://github.com/zerouno2345seis-oss/Qari.git && cd Qari/macpulse
npm install && npm start
```

## أوامر أخرى

```bash
npm run dev     # الواجهة فقط في المتصفح ببيانات تجريبية: http://localhost:5173
npm test        # الاختبارات
npm run dist    # بناء .dmg و .zip في مجلد release/
```

## البنية

- `src/main`: القياسات (`collector.js`)، التوصيات، المستشعرات العميقة (`powermetrics.js`)، الشبكة لكل تطبيق (`nettop.js`)، السجل، التنبيهات، التنظيف، بدء التشغيل، الأدوات، الاختبار القياسي.
- `src/renderer`: واجهة React برسوم SVG مخصصة و12 صفحة.
- `src/renderer/api.js`: جسر Electron إن وُجد، وإلا بيانات تجريبية.

## الصلاحيات

لا يطلب التطبيق كلمة مرور المدير إلا عند: تفعيل المستشعرات العميقة، أو تعطيل عناصر النظام، أو بعض أدوات الصيانة. كل الأوامر ثابتة داخل التطبيق ولا تُبنى من مدخلات المستخدم.
