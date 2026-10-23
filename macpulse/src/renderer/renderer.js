async function tick() {
  const s = await window.macpulse.snapshot();
  document.getElementById('out').textContent = JSON.stringify({
    cpuLoad: s.load.currentLoad.toFixed(1) + '%',
    memUsedGB: (s.mem.active / 1e9).toFixed(2),
    cpuTemp: s.temp.main,
    top: s.top,
  }, null, 2);
}
setInterval(tick, 2000);
tick();
