import React, { useEffect, useRef, useState } from 'react';
import { api, isMock } from './api.js';
import { Dashboard, CpuPage, MemoryPage, ProcessesPage, StoragePage, StartupPage, HardwarePage, InsightsPage } from './pages/index.jsx';

const HISTORY = 90;
const PAGES = [
  ['dashboard', 'لوحة المعلومات', '◉', Dashboard],
  ['cpu', 'المعالج', '▦', CpuPage],
  ['memory', 'الذاكرة', '▤', MemoryPage],
  ['processes', 'العمليات', '☰', ProcessesPage],
  ['storage', 'التخزين والتنظيف', '◔', StoragePage],
  ['startup', 'بدء التشغيل', '⏻', StartupPage],
  ['hardware', 'إمكانيات الجهاز', '⌘', HardwarePage],
  ['insights', 'التوصيات', '✦', InsightsPage],
];

const push = (arr, v) => [...arr, v].slice(-HISTORY);

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [cur, setCur] = useState(null);
  const [hist, setHist] = useState({ cpu: [], mem: [], temp: [], rx: [], tx: [], swap: [], read: [], write: [] });
  const ref = useRef(setHist);

  useEffect(() => api.onTick(s => {
    setCur(s);
    ref.current(h => ({
      cpu: push(h.cpu, s.cpu.load),
      mem: push(h.mem, (s.mem.used / s.mem.total) * 100),
      temp: push(h.temp, s.temp.cpu ?? 0),
      rx: push(h.rx, s.net.rx), tx: push(h.tx, s.net.tx),
      swap: push(h.swap, s.mem.swapUsed),
      read: push(h.read, s.io?.read ?? 0), write: push(h.write, s.io?.write ?? 0),
    }));
  }), []);

  const Current = PAGES.find(p => p[0] === page)[3];
  const crit = cur?.advice.filter(a => a.severity === 'critical').length || 0;

  return (
    <div className="app">
      <aside>
        <div className="brand"><span className="pulse" />MacPulse</div>
        <nav>
          {PAGES.map(([id, label, icon]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
              <span className="ico">{icon}</span>{label}
              {id === 'insights' && crit > 0 && <em>{crit}</em>}
            </button>
          ))}
        </nav>
        <div className="side-foot">{isMock ? 'وضع تجريبي (بيانات وهمية)' : 'متصل بالنظام'}</div>
      </aside>
      <main>
        {cur ? <Current s={cur} h={hist} go={setPage} /> : <div className="loading">جارٍ جمع البيانات…</div>}
      </main>
    </div>
  );
}
