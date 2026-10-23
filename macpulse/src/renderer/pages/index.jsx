import React, { useEffect, useMemo, useState } from 'react';
import { AreaChart, Gauge, Bar, StackBar, Card } from '../components/charts.jsx';
import { api } from '../api.js';
import { fmtBytes, fmtRate, pct, colorFor } from '../utils.js';

const C = { cpu: '#5ac8fa', mem: '#bf5af2', temp: '#ff9f0a', rx: '#30d158', tx: '#ff6482', io: '#64d2ff' };
const SEV = { critical: 'حرج', warning: 'تحذير', info: 'معلومة' };

function Title({ children, sub }) {
  return <div className="page-title"><h1>{children}</h1>{sub && <p>{sub}</p>}</div>;
}

function Advice({ items, limit }) {
  const list = limit ? items.slice(0, limit) : items;
  if (!list.length) return <div className="empty">✓ لا توجد مشاكل. جهازك بحالة ممتازة.</div>;
  return (
    <ul className="advice">
      {list.map(a => (
        <li key={a.id} className={a.severity}>
          <span className="tag">{SEV[a.severity]}</span>
          <div><b>{a.title}</b><p>{a.detail}</p></div>
        </li>
      ))}
    </ul>
  );
}

function ProcList({ procs, n = 6 }) {
  return (
    <table className="tbl">
      <tbody>
        {procs.slice(0, n).map(p => (
          <tr key={p.pid}>
            <td>{p.name}</td>
            <td style={{ width: 120 }}><Bar value={p.cpu} max={100} color={colorFor(p.cpu, 40, 80)} /></td>
            <td className="num">{pct(p.cpu)}</td>
            <td className="num dim">{fmtBytes(p.memBytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Dashboard({ s, h, go }) {
  const memPct = (s.mem.used / s.mem.total) * 100;
  const b = s.battery;
  return (
    <>
      <Title sub="نظرة حيّة شاملة على أداء جهازك">لوحة المعلومات</Title>
      <div className="grid g5">
        <Card className="center"><Gauge value={s.score} color={colorFor(100 - s.score, 30, 50)} label={s.score} sub="صحة النظام" /></Card>
        <Card className="center"><Gauge value={s.cpu.load} color={colorFor(s.cpu.load)} label={pct(s.cpu.load)} sub="المعالج" /></Card>
        <Card className="center"><Gauge value={memPct} color={colorFor(memPct, 75, 90)} label={pct(memPct)} sub={`${fmtBytes(s.mem.used)} / ${fmtBytes(s.mem.total, 0)}`} /></Card>
        <Card className="center"><Gauge value={s.temp.cpu ?? 0} max={110} color={colorFor(s.temp.cpu ?? 0, 75, 90)} label={s.temp.cpu != null ? `${s.temp.cpu.toFixed(0)}°` : '—'} sub="حرارة المعالج" /></Card>
        <Card className="center"><Gauge value={b.percent ?? 0} color={b.hasBattery ? 'var(--good)' : '#555'} label={b.hasBattery ? pct(b.percent) : '—'} sub={b.hasBattery ? (b.charging ? 'يشحن' : 'بطارية') : 'لا توجد بطارية'} /></Card>
      </div>
      <div className="grid g2">
        <Card title="المعالج" right={<span className="big" style={{ color: C.cpu }}>{pct(s.cpu.load)}</span>}>
          <AreaChart max={100} series={[{ data: h.cpu, color: C.cpu }]} format={v => `${v.toFixed(0)}%`} />
        </Card>
        <Card title="الذاكرة" right={<span className="big" style={{ color: C.mem }}>{pct(memPct)}</span>}>
          <AreaChart max={100} series={[{ data: h.mem, color: C.mem }]} format={v => `${v.toFixed(0)}%`} />
        </Card>
        <Card title="الشبكة" right={<span className="dim">↓ {fmtRate(s.net.rx)} · ↑ {fmtRate(s.net.tx)}</span>}>
          <AreaChart series={[{ data: h.rx, color: C.rx }, { data: h.tx, color: C.tx }]} format={fmtRate} />
        </Card>
        <Card title="الحرارة" right={<span className="big" style={{ color: C.temp }}>{s.temp.cpu != null ? `${s.temp.cpu.toFixed(0)}°C` : '—'}</span>}>
          <AreaChart max={110} series={[{ data: h.temp, color: C.temp }]} format={v => `${v.toFixed(0)}°`} />
        </Card>
      </div>
      <div className="grid g2">
        <Card title="أكثر العمليات استهلاكًا" right={<button className="link" onClick={() => go('processes')}>عرض الكل</button>}>
          <ProcList procs={s.top} />
        </Card>
        <Card title="توصيات" right={<button className="link" onClick={() => go('insights')}>عرض الكل</button>}>
          <Advice items={s.advice} limit={3} />
        </Card>
      </div>
    </>
  );
}

export function CpuPage({ s, h }) {
  return (
    <>
      <Title sub="الحِمل الكلي وحِمل كل نواة">المعالج</Title>
      <div className="grid g2">
        <Card title="الحِمل عبر الزمن" right={<span className="big" style={{ color: C.cpu }}>{pct(s.cpu.load, 1)}</span>}>
          <AreaChart height={200} max={100} series={[{ data: h.cpu, color: C.cpu }]} format={v => `${v.toFixed(0)}%`} />
          <div className="legend"><span><i style={{ background: C.cpu }} />مستخدم: <b>{pct(s.cpu.user, 1)}</b></span><span>نظام: <b>{pct(s.cpu.system, 1)}</b></span><span>عمليات: <b>{s.processCount}</b></span></div>
        </Card>
        <Card title={`الأنوية (${s.cpu.cores.length})`}>
          <div className="cores">
            {s.cpu.cores.map((c, i) => (
              <div key={i} className="core">
                <div className="core-bar"><div style={{ height: `${c}%`, background: colorFor(c) }} /></div>
                <small>{i + 1}</small><small className="dim">{c.toFixed(0)}%</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="أعلى العمليات على المعالج"><ProcList procs={s.top} n={10} /></Card>
    </>
  );
}

export function MemoryPage({ s, h }) {
  const { total, used, free, swapUsed, swapTotal, wired, pressure } = s.mem;
  const PRESS = { normal: ['طبيعي', 'var(--good)'], warn: ['متوسط', 'var(--warn)'], critical: ['حرج', 'var(--bad)'] }[pressure];
  const other = Math.max(0, total - used - free);
  return (
    <>
      <Title sub="توزيع الذاكرة وضغطها وذاكرة التبديل">الذاكرة</Title>
      <div className="grid g2">
        <Card title="الاستخدام عبر الزمن" right={<span className="big" style={{ color: C.mem }}>{pct((used / total) * 100, 1)}</span>}>
          <AreaChart height={200} max={100} series={[{ data: h.mem, color: C.mem }]} format={v => `${v.toFixed(0)}%`} />
        </Card>
        <Card title="ضغط الذاكرة" className="center">
          <div className="pressure" style={{ color: PRESS[1] }}>{PRESS[0]}</div>
          <p className="dim">مؤشر macOS الفعلي أدق من نسبة الاستخدام وحدها.</p>
        </Card>
      </div>
      <Card title="توزيع الذاكرة">
        <StackBar total={total} format={v => fmtBytes(v, 2)} parts={[
          { label: 'مستخدمة', value: used, color: C.mem },
          { label: 'مخزّنة مؤقتًا', value: Math.min(wired || 0, other), color: '#5e5ce6' },
          { label: 'متاحة', value: free, color: '#30d158' },
        ]} />
      </Card>
      <Card title="ذاكرة التبديل (Swap)" right={<span className="dim">{fmtBytes(swapUsed)} / {fmtBytes(swapTotal)}</span>}>
        <AreaChart height={110} series={[{ data: h.swap, color: C.tx }]} format={fmtBytes} />
      </Card>
      <Card title="أكثر العمليات استهلاكًا للذاكرة">
        <table className="tbl"><tbody>
          {[...s.top].sort((a, b) => b.memBytes - a.memBytes).slice(0, 8).map(p => (
            <tr key={p.pid}><td>{p.name}</td><td style={{ width: 160 }}><Bar value={p.memBytes} max={total} color={C.mem} /></td><td className="num">{fmtBytes(p.memBytes)}</td></tr>
          ))}
        </tbody></table>
      </Card>
    </>
  );
}

export function ProcessesPage({ s }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('cpu');
  const [msg, setMsg] = useState('');
  const rows = useMemo(() => s.top
    .filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'mem' ? b.memBytes - a.memBytes : b.cpu - a.cpu)),
  [s.top, q, sort]);
  const kill = async p => {
    const r = await api.killProcess(p.pid);
    setMsg(r.cancelled ? '' : r.ok ? `تم إرسال طلب الإنهاء إلى ${p.name}` : `تعذّر: ${r.error}`);
  };
  return (
    <>
      <Title sub={`${s.processCount} عملية قيد التشغيل`}>العمليات</Title>
      <Card>
        <div className="toolbar">
          <input placeholder="ابحث عن عملية…" value={q} onChange={e => setQ(e.target.value)} />
          <div className="seg">
            {[['cpu', 'المعالج'], ['mem', 'الذاكرة'], ['name', 'الاسم']].map(([k, l]) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
        </div>
        {msg && <div className="note">{msg}</div>}
        <table className="tbl full">
          <thead><tr><th>العملية</th><th>PID</th><th>المعالج</th><th>الذاكرة</th><th /></tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.pid}>
                <td>{p.name}</td><td className="num dim">{p.pid}</td>
                <td className="num" style={{ color: colorFor(p.cpu, 40, 80) }}>{pct(p.cpu, 1)}</td>
                <td className="num">{fmtBytes(p.memBytes)}</td>
                <td><button className="danger" onClick={() => kill(p)}>إنهاء</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function StoragePage({ s, h }) {
  const [rows, setRows] = useState(null);
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const scan = async () => {
    setBusy(true); setRes(null);
    const r = await api.scanCleanup();
    setRows(r); setSel(Object.fromEntries(r.map(x => [x.id, x.id !== 'trash']))); setBusy(false);
  };
  const ids = Object.keys(sel).filter(k => sel[k]);
  const total = (rows || []).filter(r => sel[r.id]).reduce((a, r) => a + r.bytes, 0);
  const run = async () => { setBusy(true); const r = await api.runCleanup(ids); setRes(r); setBusy(false); if (!r.cancelled) scan(); };
  return (
    <>
      <Title sub="مساحة الأقراص وتنظيف الملفات المؤقتة بأمان">التخزين والتنظيف</Title>
      <div className="grid g2">
        {s.disks.map(d => (
          <Card key={d.mount} title={d.mount} right={<span className="dim">{d.fs}</span>}>
            <Bar value={d.usePct} color={colorFor(d.usePct, 80, 92)} height={14} />
            <div className="legend"><span>مستخدم: <b>{fmtBytes(d.used)}</b></span><span>حر: <b>{fmtBytes(d.size - d.used)}</b></span><span>الحجم: <b>{fmtBytes(d.size, 0)}</b></span></div>
          </Card>
        ))}
        <Card title="نشاط القرص (قراءة/كتابة)">
          <AreaChart height={110} series={[{ data: h.read, color: C.io }, { data: h.write, color: C.tx }]} format={v => `${v.toFixed(0)}/s`} />
        </Card>
      </div>
      <Card title="منظّف الملفات المؤقتة" right={<button className="primary" disabled={busy} onClick={scan}>{rows ? 'إعادة الفحص' : 'ابدأ الفحص'}</button>}>
        <p className="dim">تُنقل الملفات إلى سلة المحذوفات ولا تُحذف نهائيًا، ويُطلب تأكيدك قبل التنفيذ.</p>
        {busy && <div className="note">جارٍ العمل…</div>}
        {rows && (
          <>
            <ul className="clean">
              {rows.map(r => (
                <li key={r.id}>
                  <label><input type="checkbox" checked={!!sel[r.id]} onChange={e => setSel({ ...sel, [r.id]: e.target.checked })} />
                    <span><b>{r.name}</b><small className="dim">{r.dir}</small></span></label>
                  <span className="num">{fmtBytes(r.bytes)}</span>
                </li>
              ))}
            </ul>
            <div className="toolbar"><b>سيتم تحرير: {fmtBytes(total)}</b><button className="primary" disabled={busy || !ids.length} onClick={run}>نقل إلى السلة</button></div>
          </>
        )}
        {res && !res.cancelled && <div className="note good">نُقل {res.trashed} عنصرًا ({fmtBytes(res.bytes)})، وتعذّر {res.failed}.</div>}
      </Card>
    </>
  );
}

export function StartupPage() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.listStartup().then(setItems); }, []);
  return (
    <>
      <Title sub="البرامج والخدمات التي تعمل مع النظام">بدء التشغيل</Title>
      <Card right={<span className="dim">{items ? `${items.length} عنصر` : ''}</span>}>
        {!items ? <div className="loading">جارٍ القراءة…</div> : (
          <table className="tbl full">
            <thead><tr><th>العنصر</th><th>النطاق</th><th>تشغيل عند الدخول</th><th /></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.file}>
                  <td><b>{i.label}</b><small className="dim block">{i.file}</small></td>
                  <td>{i.scope}</td>
                  <td>{i.runAtLoad == null ? '—' : i.runAtLoad ? 'نعم' : 'لا'}</td>
                  <td><button onClick={() => api.reveal(i.file)}>إظهار في Finder</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="dim">للتعطيل: افتح الملف في Finder وانقله خارج المجلد، أو استخدم إعدادات النظام ‹ عناصر تسجيل الدخول›.</p>
      </Card>
    </>
  );
}

export function HardwarePage() {
  const [p, setP] = useState(null);
  useEffect(() => { api.getProfile().then(setP); }, []);
  if (!p) return <div className="loading">جارٍ قراءة مواصفات الجهاز…</div>;
  const Row = ({ k, v }) => <tr><td className="dim">{k}</td><td>{v ?? '—'}</td></tr>;
  return (
    <>
      <Title sub="مواصفات الجهاز وإمكانياته">إمكانيات الجهاز</Title>
      <div className="grid g2">
        <Card title="النظام"><table className="tbl"><tbody>
          <Row k="الطراز" v={p.model} /><Row k="النظام" v={p.os} /><Row k="النواة" v={p.kernel} /><Row k="الرقم التسلسلي" v={p.serial} />
        </tbody></table></Card>
        <Card title="المعالج"><table className="tbl"><tbody>
          <Row k="الطراز" v={p.cpu.brand} /><Row k="الأنوية" v={`${p.cpu.cores} (فعلية ${p.cpu.physical})`} /><Row k="السرعة" v={`${p.cpu.speed} GHz (حتى ${p.cpu.max} GHz)`} />
        </tbody></table></Card>
        <Card title="الذاكرة"><table className="tbl"><tbody>
          <Row k="الإجمالي" v={fmtBytes(p.memory.total, 0)} />
          {p.memory.modules.map((m, i) => <Row key={i} k={`وحدة ${i + 1}`} v={`${fmtBytes(m.size, 0)} ${m.type || ''} ${m.clock ? `@ ${m.clock} MHz` : ''}`} />)}
        </tbody></table></Card>
        <Card title="الرسوميات والشاشات"><table className="tbl"><tbody>
          {p.gpus.map((g, i) => <Row key={i} k="GPU" v={`${g.name}${g.cores ? ` · ${g.cores} نواة` : ''}`} />)}
          {p.displays.map((d, i) => <Row key={i} k="شاشة" v={`${d.name} · ${d.resolution} @ ${d.refresh}Hz`} />)}
        </tbody></table></Card>
        <Card title="التخزين"><table className="tbl"><tbody>
          {p.disks.map((d, i) => <Row key={i} k={d.type} v={`${d.name} · ${fmtBytes(d.size, 0)} · SMART: ${d.smart}`} />)}
        </tbody></table></Card>
      </div>
    </>
  );
}

export function InsightsPage({ s }) {
  return (
    <>
      <Title sub="تحليل تلقائي لقياسات جهازك الحالية">التوصيات</Title>
      <Card right={<span className="dim">درجة الصحة: <b>{s.score}/100</b></span>}><Advice items={s.advice} /></Card>
    </>
  );
}
