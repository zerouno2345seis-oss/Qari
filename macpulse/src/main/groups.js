// Groups helper processes under their parent app ("Google Chrome Helper (Renderer)" -> "Google Chrome").
function appName(name) {
  return name.replace(/\s*\((Renderer|GPU|Plugin|Alerts?)\)\s*$/i, '').replace(/\s+Helper$/i, '').trim() || name;
}

function groupByApp(procs) {
  const map = new Map();
  for (const p of procs) {
    const k = appName(p.name);
    const g = map.get(k) || { name: k, cpu: 0, memBytes: 0, count: 0, pids: [] };
    g.cpu += p.cpu; g.memBytes += p.memBytes; g.count++; g.pids.push(p.pid);
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => b.cpu - a.cpu);
}

module.exports = { appName, groupByApp };
