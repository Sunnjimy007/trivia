import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';

export interface RunningServer {
  url: string;
  output: () => string;
  // Startup messages arrive on separate streams, so wait for one instead of assuming it is already there.
  waitForOutput: (pattern: RegExp, ms?: number) => Promise<void>;
  stop: () => Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });
}

// Runs the real server (src/index.ts) as a child process on a free port, so tests exercise
// the actual wiring: environment variables, HTTP routes and socket events.
export async function startServer(env: Record<string, string> = {}): Promise<RunningServer> {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', path.join(__dirname, '../../src/index.ts')],
    {
      env: { ...process.env, ADMIN_PASSWORD: '', PORT: String(port), ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start in time:\n${out}`)), 20000);
    const check = () => {
      if (out.includes('Trivia server running')) { clearTimeout(timer); resolve(); }
    };
    child.stdout.on('data', check);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited early (${code}):\n${out}`)); });
  });

  return {
    url: `http://127.0.0.1:${port}`,
    output: () => out,
    waitForOutput: async (pattern, ms = 3000) => {
      const deadline = Date.now() + ms;
      while (!pattern.test(out)) {
        if (Date.now() > deadline) throw new Error(`Server output never matched ${pattern}:\n${out}`);
        await new Promise((r) => setTimeout(r, 25));
      }
    },
    stop: () => new Promise<void>((resolve) => {
      if (child.exitCode !== null) { resolve(); return; }
      child.once('exit', () => resolve());
      child.kill();
    }),
  };
}
