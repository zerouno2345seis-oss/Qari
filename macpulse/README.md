# MacPulse

تطبيق Electron + React لمراقبة أداء macOS وتحليل العتاد وتنظيف النظام بأمان. التفاصيل والخطة في [PROPOSAL.md](PROPOSAL.md).

## التشغيل

```bash
npm install
npm start          # يبني الواجهة ثم يشغّل Electron (على macOS)
npm run dev        # واجهة فقط في المتصفح ببيانات تجريبية: http://localhost:5173
npm test           # اختبارات محرك التوصيات
npm run dist       # حزمة .app/.dmg
```

لتطوير الواجهة داخل Electron: شغّل `npm run dev` ثم `VITE_DEV_URL=http://localhost:5173 npx electron .`

## البنية

- `src/main`: جمع القياسات (`collector.js`)، التوصيات (`recommendations.js`)، التنظيف (`cleaner.js`)، بدء التشغيل، ملف الجهاز، IPC.
- `src/renderer`: واجهة React برسوم SVG مخصصة (`components/charts.jsx`) و8 صفحات.
- `src/renderer/api.js`: يستخدم جسر Electron إن وُجد، وإلا بيانات تجريبية للتطوير في المتصفح.
