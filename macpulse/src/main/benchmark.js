// Quick capability benchmark: CPU (single/multi via worker threads), memory bandwidth, disk speed.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const os = require('os');
const path = require('path');

function cpuWork(ms) {
  const end = Date.now() + ms;
  let x = 1.0001, ops = 0;
  while (Date.now() < end) {
    for (let i = 0; i < 200000; i++) x = Math.sqrt(x * 1.0000001 + i) * 1.0000002 + Math.sin(x);
    ops += 200000;
  }
  return ops / (ms / 1000) / 1e6; // M ops/s
}

if (!isMainThread && workerData && workerData.bench === 'cpu') {
  parentPort.postMessage(cpuWork(workerData.ms));
} else {
  // (module body continues below for the main thread)
}

const runWorker = ms => new Promise((res, rej) => {
  const w = new Worker(__filename, { workerData: { bench: 'cpu', ms } });
  w.once('message', res); w.once('error', rej);
});

function memBandwidth() {
  const n = 128 * 1024 * 1024, a = Buffer.alloc(n, 1), b = Buffer.alloc(n);
  const t = process.hrtime.bigint();
  for (let i = 0; i < 6; i++) a.copy(b);
  const s = Number(process.hrtime.bigint() - t) / 1e9;
  return (6 * n) / 1e9 / s; // GB/s copied
}

function diskSpeed() {
  const f = path.join(os.tmpdir(), `macpulse-bench-${process.pid}.bin`);
  const size = 256 * 1024 * 1024, buf = Buffer.alloc(size, 7);
  let t = process.hrtime.bigint();
  const fd = fs.openSync(f, 'w');
  fs.writeSync(fd, buf); fs.fsyncSync(fd); fs.closeSync(fd);
  const w = Number(process.hrtime.bigint() - t) / 1e9;
  t = process.hrtime.bigint();
  fs.readFileSync(f);
  const r = Number(process.hrtime.bigint() - t) / 1e9;
  fs.unlinkSync(f);
  return { write: size / 1e6 / w, read: size / 1e6 / r }; // MB/s (read may include OS cache)
}

async function run(ms = 1500) {
  const cores = os.cpus().length;
  const single = await runWorker(ms);
  const multiParts = await Promise.all(Array.from({ length: cores }, () => runWorker(ms)));
  const multi = multiParts.reduce((a, b) => a + b, 0);
  const disk = diskSpeed();
  return { cores, cpuSingle: single, cpuMulti: multi, memGBs: memBandwidth(), diskWrite: disk.write, diskRead: disk.read };
}

module.exports = { run, cpuWork };
