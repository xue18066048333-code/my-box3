import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.STAGE1_PORT ?? 3000);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const baseEnv = {
  ...process.env,
  CATALOG_DATA_MODE: 'demo',
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? '.playwright-browsers',
};

function run(command, args, env = baseEnv) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {cwd: root, env, shell: process.platform === 'win32', stdio: 'inherit', windowsHide: true});
    child.on('error', rejectRun);
    child.on('close', (code, signal) => resolveRun({code: code ?? 1, signal}));
  });
}

function portOpen() {
  return new Promise((resolveOpen) => {
    const socket = createConnection({host: '127.0.0.1', port});
    socket.once('connect', () => {
      socket.destroy();
      resolveOpen(true);
    });
    socket.once('error', () => resolveOpen(false));
  });
}

async function waitForPort(child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`demo server exited before readiness (code ${child.exitCode})`);
    if (await portOpen()) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  throw new Error(`demo server did not listen on 127.0.0.1:${port} within 60 seconds`);
}

async function stopServer(child) {
  if (child.exitCode === null) child.kill();
  const shutdownDeadline = Date.now() + 10_000;
  while (Date.now() < shutdownDeadline) {
    if (!(await portOpen())) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error(`port 127.0.0.1:${port} remained open after stopping server process ${child.pid}`);
}

async function main() {
  const steps = [
    ['db reset', ['run', 'db:reset']],
    ['database tests', ['run', 'test:db']],
    ['typecheck', ['run', 'typecheck']],
    ['unit tests', ['test']],
    ['build', ['run', 'build']],
  ];
  for (const [label, args] of steps) {
    console.log(`\n=== Stage 1 gate: ${label} ===`);
    const result = await run(npmCommand, args);
    if (result.code !== 0) throw new Error(`${label} failed with exit ${result.code}${result.signal ? ` (${result.signal})` : ''}`);
  }

  console.log('\n=== Stage 1 gate: start demo server ===');
  if (await portOpen()) throw new Error(`port 127.0.0.1:${port} is already in use; stop the existing server before running the gate`);
  const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--port', String(port)], {
    cwd: root,
    env: baseEnv,
    stdio: 'ignore',
    windowsHide: true,
  });
  try {
    await waitForPort(server);
    console.log(`Demo server ${server.pid} is ready on 127.0.0.1:${port}`);
    const e2eEnv = {...baseEnv, STAGE1_GATE: '1'};
    console.log('\n=== Stage 1 gate: Playwright ===');
    const result = await run(npmCommand, ['run', 'test:e2e'], e2eEnv);
    if (result.code !== 0) throw new Error(`Playwright failed with exit ${result.code}${result.signal ? ` (${result.signal})` : ''}`);
  } finally {
    console.log(`\n=== Stage 1 gate: stop demo server ${server.pid} ===`);
    await stopServer(server);
    console.log(`Demo server ${server.pid} stopped and port 127.0.0.1:${port} is closed`);
  }
}

try {
  await main();
  console.log('\nStage 1 gate passed.');
} catch (error) {
  console.error(`\nStage 1 gate failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
