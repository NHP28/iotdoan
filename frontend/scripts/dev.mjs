import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const requestedPort = Number(process.env.PORT) || 3001;
const nextCli = new URL('../node_modules/next/dist/bin/next', import.meta.url);
function available(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '0.0.0.0', () => server.close(() => resolve(true)));
  });
}
let port = requestedPort;
let running = false;
if (!await available(port)) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/login`, { signal: AbortSignal.timeout(10000) });
    if (response.ok && (await response.text()).includes('DriverHub')) {
      console.log(`DriverHub đang chạy tại http://localhost:${port}`);
      console.log('Dùng tiến trình hiện tại; các thay đổi được cập nhật tự động.');
      running = true;
    }
  } catch {}
  while (!running && port < requestedPort + 20 && !await available(port)) port++;
  if (port >= requestedPort + 20) throw new Error('Không tìm thấy cổng trống. Hãy đặt biến PORT để chọn cổng khác.');
  if (!running) console.log(`Cổng ${requestedPort} đang được sử dụng. Chuyển sang cổng ${port}.`);
}
if (!running) {
  const child = spawn(process.execPath, [fileURLToPath(nextCli), 'dev', '-p', String(port), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true });
  child.on('exit', code => { process.exitCode = code ?? 0; });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
}
