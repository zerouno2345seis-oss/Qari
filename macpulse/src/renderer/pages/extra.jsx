import React, { useEffect, useState } from 'react';
import { AreaChart, Gauge, Bar, Card } from '../components/charts.jsx';
import { api } from '../api.js';
import { fmtBytes, fmtRate, pct, colorFor } from '../utils.js';

const C = { cpu: '#5ac8fa', mem: '#bf5af2', temp: '#ff9f0a', rx: '#30d158', tx: '#ff6482', gpu: '#ffd60a', pow: '#64d2ff' };

const Title = ({ children, sub }) => <div className="page-title"><h1>{children}</h1>{sub && <p>{sub}</p>}</div>;
const THERMAL = { nominal: ['طبيعي', 'var(--good)'], light: ['خفيف', 'var(--good)'], moderate: ['متوسط', 'var(--warn)'], heavy: ['مرتفع', 'var(--bad)'], critical: ['حرج', 'var(--bad)'] };

function useAction() {
  const [msg, setMsg] = useState(null);
  const run = async fn => {
    setMsg({ text: 'جارٍ التنفيذ…' });
    const r = await fn();
    if (r?.cancelled) return setMsg(null);
    setMsg(r?.ok === false ? { text: `تعذّر: ${r.error}`, bad: true } : { text: 'تم بنجاح ✓', good: true });
    return r;
  };
  return [msg, run];
}
const Note = ({ m }) => m && <div className={`note ${m.good ? 'good' : ''} ${m.bad ? 'bad' : ''}`}>{m.text}</div>;

/** Enable button / status for the privileged sensor helper. */
function SensorGate({ s }) {
  const [msg, run] = useAction();
  if (s.sensors?.active) return null;
  return (
    <Card title="المستشعرات العميقة غير مفعّلة">
      <p className="dim">لقراءة حرارة المعالج ودرجة الضغط الحراري وسرعة المراوح واستهلاك الـ GPU والطاقة يحتاج macOS إلى صلاحية المدير (أداة powermetrics). تُطلب كلمة المرور مرة واحدة، ويتوقف العمل تلقائيًا عند إغلاق التطبيق.</p>
      <button className="primary" onClick={() => run(() => api.sensorsEnable())}>تفعيل المستشعرات</button>
      <Note m={msg} />
      <p className="dim small">على أجهزة Apple Silicon لا يوفّر powermetrics درجات حرارة دقيقة للأنوية؛ يظهر الضغط الحراري والطاقة والمراوح (إن وُجدت) فقط.</p>
    </Card>
  );
}

export function SensorsPage({ s, h }) {
  const sn = s.sensors;
  const th = sn?.thermal ? THERMAL[sn.thermal.toLowerCase()] || [sn.thermal, 'var(--warn)'] : null;
  const [msg, run] = useAction();
  return (
    <>
      <Title sub="الحرارة والمراوح والطاقة والـ GPU">المستشعرات</Title>
      <SensorGate s={s} />
      {sn?.active && (
        <>
          <div className="grid g4">
            <Card className="center"><Gauge value={sn.dieTemp ?? 0} max={110} color={colorFor(sn.dieTemp ?? 0, 75, 90)} label={sn.dieTemp != null ? `${sn.dieTemp.toFixed(0)}°` : '—'} sub="حرارة المعالج" /></Card>
            <Card className="center"><div className="pressure" style={{ color: th?.[1] }}>{th ? th[0] : '—'}</div><div className="dim">الضغط الحراري</div></Card>
            <Card className="center"><Gauge value={sn.gpu.active ?? 0} color={colorFor(sn.gpu.active ?? 0)} label={pct(sn.gpu.active)} sub={sn.gpu.freqMHz ? `GPU @ ${sn.gpu.freqMHz} MHz` : 'GPU'} /></Card>
            <Card className="center"><div className="pressure" style={{ color: C.pow }}>{sn.power.package != null ? `${sn.power.package.toFixed(1)}W` : '—'}</div><div className="dim">الطاقة الكلية (CPU+GPU+ANE)</div></Card>
          </div>
          <div className="grid g2">
            <Card title="حرارة المعالج"><AreaChart max={110} series={[{ data: h.temp, color: C.temp }]} format={v => `${v.toFixed(0)}°`} /></Card>
            <Card title="استخدام الـ GPU"><AreaChart max={100} series={[{ data: h.gpu, color: C.gpu }]} format={v => `${v.toFixed(0)}%`} /></Card>
            <Card title="الطاقة (واط)"><AreaChart series={[{ data: h.power, color: C.pow }]} format={v => `${v.toFixed(1)}W`} /></Card>
            <Card title="المراوح">
              {sn.fans.length ? sn.fans.map((f, i) => (
                <div key={i} className="fan"><span>مروحة {i + 1}</span><Bar value={f} max={6500} color={colorFor((f / 6500) * 100)} /><b className="num">{Math.round(f)} RPM</b></div>
              )) : <p className="dim">لا تُبلّغ هذه الآلة عن مراوح (أجهزة بلا مراوح أو لم يوفرها النظام).</p>}
              {sn.power.cpu != null && <div className="legend"><span>CPU: <b>{sn.power.cpu.toFixed(2)}W</b></span><span>GPU: <b>{sn.power.gpu?.toFixed(2)}W</b></span><span>ANE: <b>{sn.power.ane?.toFixed(2)}W</b></span></div>}
            </Card>
          </div>
          <button onClick={() => run(() => api.sensorsDisable())}>إيقاف المستشعرات</button><Note m={msg} />
        </>
      )}
    </>
  );
}

export function NetApps({ apps }) {
  if (!apps?.length) return <div className="empty">لا نشاط شبكي ملحوظ (أو القراءة غير متاحة).</div>;
  const peak = Math.max(...apps.map(a => a.rx + a.tx));
  return (
    <table className="tbl"><tbody>
      {apps.map(a => (
        <tr key={a.pid}>
          <td>{a.name}</td>
          <td style={{ width: 140 }}><Bar value={a.rx + a.tx} max={peak} color={C.rx} /></td>
          <td className="num" style={{ color: C.rx }}>↓ {fmtRate(a.rx)}</td>
          <td className="num" style={{ color: C.tx }}>↑ {fmtRate(a.tx)}</td>
        </tr>
      ))}
    </tbody></table>
  );
}

const RANGES = [['ساعة', 3600e3], ['6 ساعات', 6 * 3600e3], ['24 ساعة', 24 * 3600e3]];

export function HistoryPage() {
  const [range, setRange] = useState(RANGES[0][1]);
  const [rows, setRows] = useState([]);
  const [msg, run] = useAction();
  useEffect(() => {
    let alive = true;
    const load = () => api.history(range).then(r => alive && setRows(r));
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [range]);
  const col = k => rows.map(r => r[k] ?? 0);
  const avg = k => (rows.length ? rows.reduce((a, r) => a + (r[k] || 0), 0) / rows.length : 0);
  const max = k => Math.max(0, ...col(k));
  return (
    <>
      <Title sub="السجل التاريخي لآخر 24 ساعة (محفوظ محليًا على جهازك)">السجل</Title>
      <div className="toolbar">
        <div className="seg">{RANGES.map(([l, v]) => <button key={v} className={range === v ? 'on' : ''} onClick={() => setRange(v)}>{l}</button>)}</div>
        <button onClick={() => run(() => api.exportHistory())}>تصدير CSV</button>
      </div>
      <Note m={msg} />
      {!rows.length ? <div className="empty">لا توجد بيانات بعد؛ تُسجَّل نقطة كل 10 ثوانٍ.</div> : (
        <div className="grid g2">
          <Card title="المعالج" right={<span className="dim">متوسط {pct(avg('cpu'))} · أعلى {pct(max('cpu'))}</span>}><AreaChart max={100} points={rows.length} series={[{ data: col('cpu'), color: C.cpu }]} format={v => `${v.toFixed(0)}%`} /></Card>
          <Card title="الذاكرة" right={<span className="dim">متوسط {pct(avg('mem'))} · أعلى {pct(max('mem'))}</span>}><AreaChart max={100} points={rows.length} series={[{ data: col('mem'), color: C.mem }]} format={v => `${v.toFixed(0)}%`} /></Card>
          <Card title="الحرارة" right={<span className="dim">أعلى {max('temp').toFixed(0)}°</span>}><AreaChart max={110} points={rows.length} series={[{ data: col('temp'), color: C.temp }]} format={v => `${v.toFixed(0)}°`} /></Card>
          <Card title="الشبكة"><AreaChart points={rows.length} series={[{ data: col('rx'), color: C.rx }, { data: col('tx'), color: C.tx }]} format={fmtRate} /></Card>
          <Card title="درجة صحة النظام" right={<span className="dim">متوسط {avg('score').toFixed(0)}</span>}><AreaChart max={100} points={rows.length} series={[{ data: col('score'), color: 'var(--good)' }]} format={v => v.toFixed(0)} /></Card>
        </div>
      )}
    </>
  );
}

export function StartupPage() {
  const [items, setItems] = useState(null);
  const [login, setLogin] = useState([]);
  const [msg, run] = useAction();
  const load = () => { api.listStartup().then(setItems); api.listLoginItems().then(r => setLogin(Array.isArray(r) ? r : [])); };
  useEffect(load, []);
  const act = async fn => { await run(fn); load(); };
  return (
    <>
      <Title sub="تحكّم بما يعمل مع النظام. التعطيل قابل للتراجع">بدء التشغيل</Title>
      <Note m={msg} />
      <Card title="عناصر تسجيل الدخول (Login Items)">
        {login.length === 0 ? <div className="empty">لا عناصر (أو لم يُمنح إذن الأتمتة).</div> : (
          <table className="tbl"><tbody>{login.map(n => (
            <tr key={n}><td><b>{n}</b></td><td className="num"><button className="danger" onClick={() => act(() => api.removeLoginItem(n))}>إزالة</button></td></tr>
          ))}</tbody></table>
        )}
      </Card>
      <Card title="الخدمات والوكلاء (Launch Agents/Daemons)" right={<span className="dim">{items ? `${items.length} عنصر` : ''}</span>}>
        {!items ? <div className="loading">جارٍ القراءة…</div> : (
          <table className="tbl full">
            <thead><tr><th>العنصر</th><th>النطاق</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.file} style={{ opacity: i.disabled ? 0.55 : 1 }}>
                  <td><b>{i.label}</b><small className="dim block">{i.file}</small></td>
                  <td>{i.scope}</td>
                  <td>{i.disabled ? 'معطّل' : i.runAtLoad ? 'يعمل عند الدخول' : 'عند الطلب'}</td>
                  <td className="actions">
                    <button onClick={() => api.reveal(i.file)}>Finder</button>
                    {i.disabled
                      ? <button onClick={() => act(() => api.startupEnable(i.file))}>تفعيل</button>
                      : <button className="danger" onClick={() => act(() => api.startupDisable(i.file))}>تعطيل</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="dim small">يُنقل الملف إلى مجلد «.disabled» بجانب مكانه الأصلي، فلا يُحذف شيء. عناصر النظام وكل المستخدمين تطلب كلمة مرور المدير.</p>
      </Card>
    </>
  );
}

export function DiskExplorer() {
  const [folders, setFolders] = useState(null);
  const [files, setFiles] = useState(null);
  const [mb, setMb] = useState(500);
  const [busy, setBusy] = useState(false);
  const [msg, run] = useAction();
  const scan = async () => {
    setBusy(true);
    const [f, l] = await Promise.all([api.folderSizes(), api.largeFiles(mb)]);
    setFolders(Array.isArray(f) ? f : []); setFiles(Array.isArray(l) ? l : []); setBusy(false);
  };
  const trash = async p => { const r = await run(() => api.trashPath(p)); if (r?.ok) setFiles(fs => fs.filter(x => x.path !== p)); };
  const top = folders?.[0]?.bytes || 1;
  return (
    <Card title="مستكشف المساحة" right={<button className="primary" disabled={busy} onClick={scan}>{busy ? 'جارٍ الفحص…' : 'فحص مجلد المستخدم'}</button>}>
      <p className="dim">يعرض أكبر المجلدات وأكبر الملفات في مجلدك الشخصي. قد يستغرق الفحص دقيقة.</p>
      <Note m={msg} />
      {folders && (
        <div className="grid g2">
          <div>
            <h4>أكبر المجلدات</h4>
            <table className="tbl"><tbody>{folders.map(f => (
              <tr key={f.path}><td>{f.name}</td><td style={{ width: 120 }}><Bar value={f.bytes} max={top} color={C.mem} /></td><td className="num">{fmtBytes(f.bytes)}</td><td><button onClick={() => api.reveal(f.path)}>Finder</button></td></tr>
            ))}</tbody></table>
          </div>
          <div>
            <h4>ملفات أكبر من <input className="mini" type="number" min="50" value={mb} onChange={e => setMb(+e.target.value || 500)} /> MB</h4>
            {files.length === 0 ? <div className="empty">لا ملفات بهذا الحجم.</div> : (
              <table className="tbl"><tbody>{files.map(f => (
                <tr key={f.path}><td><b>{f.name}</b><small className="dim block">{f.path}</small></td><td className="num">{fmtBytes(f.bytes)}</td>
                  <td className="actions"><button onClick={() => api.reveal(f.path)}>Finder</button><button className="danger" onClick={() => trash(f.path)}>سلة</button></td></tr>
              ))}</tbody></table>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

const LEVEL_COLOR = lvl => (/ممتاز|كبيرة/.test(lvl) ? 'var(--good)' : /محدود/.test(lvl) ? 'var(--bad)' : 'var(--warn)');

export function ToolsPage() {
  const [actions, setActions] = useState([]);
  const [msg, run] = useAction();
  const [bench, setBench] = useState(null);
  const [running, setRunning] = useState(false);
  useEffect(() => { api.listActions().then(setActions); }, []);
  const go = async () => {
    setRunning(true); setBench(null);
    const r = await api.benchmark();
    setBench(r); setRunning(false);
  };
  const b = bench?.bench;
  return (
    <>
      <Title sub="إجراءات صيانة بنقرة واحدة، واختبار قدرات الجهاز">الأدوات</Title>
      <Card title="صيانة سريعة">
        <Note m={msg} />
        <div className="grid g2 tight">
          {actions.map(a => (
            <div key={a.id} className="tool">
              <div><b>{a.name}</b><small className="dim block">{a.note}</small></div>
              <button onClick={() => run(() => api.runAction(a.id))}>تنفيذ</button>
            </div>
          ))}
        </div>
      </Card>
      <Card title="اختبار القدرات والأداء" right={<button className="primary" disabled={running} onClick={go}>{running ? 'جارٍ الاختبار (≈10 ثوانٍ)…' : 'ابدأ الاختبار'}</button>}>
        <p className="dim">يقيس المعالج (نواة واحدة وكل الأنوية) وعرض نطاق الذاكرة وسرعة القرص، ثم يخبرك بما يناسب جهازك. أغلق البرامج الثقيلة للحصول على نتائج أدق.</p>
        {bench?.ok === false && <div className="note bad">تعذّر: {bench.error}</div>}
        {b && (
          <>
            <div className="grid g4">
              {[['معالج (نواة)', b.cpuSingle.toFixed(0), 'M ops/s'], [`معالج (${b.cores} أنوية)`, b.cpuMulti.toFixed(0), 'M ops/s'], ['عرض نطاق الذاكرة', b.memGBs.toFixed(1), 'GB/s'], ['القرص كتابة / قراءة', `${b.diskWrite.toFixed(0)} / ${b.diskRead.toFixed(0)}`, 'MB/s']].map(([k, v, u]) => (
                <Card key={k} className="center"><div className="pressure small-n">{v}</div><div className="dim">{u}</div><div>{k}</div></Card>
              ))}
            </div>
            <h4>ماذا يناسب جهازك؟</h4>
            <table className="tbl"><tbody>{bench.advice.uses.map(u => (
              <tr key={u.name}><td><b>{u.name}</b><small className="dim block">{u.note}</small></td><td className="num" style={{ color: LEVEL_COLOR(u.level) }}>{u.level}</td></tr>
            ))}</tbody></table>
            {bench.advice.tips.map((t, i) => <div key={i} className="note">{t}</div>)}
            <p className="dim small">قراءة القرص قد تتضمن تأثير ذاكرة التخزين المؤقت للنظام.</p>
          </>
        )}
      </Card>
    </>
  );
}

export function SettingsPage() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.getSettings().then(setCfg); }, []);
  if (!cfg) return <div className="loading">…</div>;
  const set = (k, v) => api.setSettings({ [k]: v }).then(setCfg);
  const Num = ({ k, label, unit }) => (
    <label className="row"><span>{label}</span><span><input className="mini" type="number" value={cfg[k]} onChange={e => set(k, e.target.value)} /> {unit}</span></label>
  );
  return (
    <>
      <Title sub="التنبيهات والخصوصية">الإعدادات</Title>
      <Card title="التنبيهات">
        <label className="row"><span>تفعيل إشعارات النظام</span><input type="checkbox" checked={cfg.notifications} onChange={e => set('notifications', e.target.checked)} /></label>
        <Num k="cpuAlert" label="تنبيه المعالج عند" unit="%" />
        <Num k="memAlert" label="تنبيه الذاكرة عند" unit="%" />
        <Num k="tempAlert" label="تنبيه الحرارة عند" unit="°C" />
        <Num k="diskFreeAlert" label="تنبيه المساحة الحرة عند أقل من" unit="%" />
        <Num k="batteryAlert" label="تنبيه البطارية عند" unit="%" />
        <Num k="sustainSamples" label="يجب أن يستمر الحِمل" unit="قراءات (×2 ثانية)" />
      </Card>
      <Card title="الخصوصية">
        <label className="row"><span>حفظ السجل التاريخي محليًا</span><input type="checkbox" checked={cfg.historyEnabled} onChange={e => set('historyEnabled', e.target.checked)} /></label>
        <p className="dim small">كل البيانات تبقى على جهازك ولا يُرسل شيء إلى أي خادم.</p>
      </Card>
    </>
  );
}
