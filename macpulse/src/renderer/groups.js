// Mirrors src/main/groups.js (kept separate so the renderer bundle has no Node dependency).
export function appName(name) {
  return name.replace(/\s*\((Renderer|GPU|Plugin|Alerts?)\)\s*$/i, '').replace(/\s+Helper$/i, '').trim() || name;
}

export function groupByApp(procs) {
  const map = new Map();
  for (const p of procs) {
    const k = appName(p.name);
    const g = map.get(k) || { name: k, cpu: 0, memBytes: 0, count: 0 };
    g.cpu += p.cpu; g.memBytes += p.memBytes; g.count++;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.cpu - a.cpu);
}
