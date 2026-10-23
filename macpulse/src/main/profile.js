const si = require('systeminformation');

// Static hardware profile (queried once).
async function getProfile() {
  const [system, cpu, mem, os, graphics, disks, memLayout] = await Promise.all([
    si.system(), si.cpu(), si.mem(), si.osInfo(), si.graphics().catch(() => ({ controllers: [], displays: [] })),
    si.diskLayout(), si.memLayout().catch(() => []),
  ]);
  return {
    model: [system.manufacturer, system.model].filter(Boolean).join(' '),
    serial: system.serial,
    os: `${os.distro} ${os.release} (${os.arch})`,
    kernel: os.kernel,
    cpu: { brand: `${cpu.manufacturer} ${cpu.brand}`, cores: cpu.cores, physical: cpu.physicalCores, speed: cpu.speed, max: cpu.speedMax },
    memory: { total: mem.total, modules: memLayout.map(m => ({ size: m.size, type: m.type, clock: m.clockSpeed })) },
    gpus: graphics.controllers.map(g => ({ name: g.model, vram: g.vram, cores: g.cores ?? null })),
    displays: graphics.displays.map(d => ({ name: d.model, resolution: `${d.resolutionX}×${d.resolutionY}`, refresh: d.currentRefreshRate })),
    disks: disks.map(d => ({ name: d.name, type: d.type, size: d.size, smart: d.smartStatus })),
  };
}

module.exports = { getProfile };
