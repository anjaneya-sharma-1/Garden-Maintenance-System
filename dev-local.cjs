const net = require("node:net");
const { spawn } = require("node:child_process");

const apiPort = Number(process.env.API_PORT ?? "8080");
const basePath = process.env.BASE_PATH ?? "/";
const apiUrl = process.env.API_URL ?? `http://localhost:${apiPort}`;

function parsePorts(value, fallback) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
}

const defaultFrontPorts = [5173, 19526, 3000];
const frontPorts = parsePorts(process.env.FRONT_PORTS, defaultFrontPorts);
const frontPortEnv = process.env.FRONT_PORT
  ? Number(process.env.FRONT_PORT)
  : null;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(ports) {
  for (const port of ports) {
    if (await isPortFree(port)) return port;
  }
  return null;
}

function run(command, args, env) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  if (!Number.isFinite(apiPort) || apiPort <= 0) {
    throw new Error("API_PORT must be a valid number.");
  }

  let frontPort = frontPortEnv;
  if (frontPort) {
    const free = await isPortFree(frontPort);
    if (!free) {
      throw new Error(`FRONT_PORT ${frontPort} is already in use.`);
    }
  } else {
    frontPort = await findFreePort(frontPorts);
  }

  if (!frontPort) {
    throw new Error(`No free frontend port found. Tried: ${frontPorts.join(", ")}`);
  }

  console.log(`API:   http://localhost:${apiPort}`);
  console.log(`Web:   http://localhost:${frontPort}`);
  console.log(`Data:  artifacts/api-server/data/local-db.json`);

  const build = run("pnpm", [
    "--filter",
    "@workspace/api-server",
    "run",
    "build",
  ]);
  const buildExit = await waitForExit(build);
  if (buildExit !== 0) {
    process.exit(buildExit);
  }

  const api = run(
    "pnpm",
    ["--filter", "@workspace/api-server", "run", "start"],
    { PORT: String(apiPort), NODE_ENV: "development" },
  );

  const web = run(
    "pnpm",
    ["--filter", "@workspace/garden-app", "run", "dev"],
    {
      PORT: String(frontPort),
      BASE_PATH: basePath,
      API_URL: apiUrl,
      NODE_ENV: "development",
    },
  );

  const shutdown = (code = 0) => {
    api.kill();
    web.kill();
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  api.on("exit", (code) => {
    if (code && code !== 0) shutdown(code);
  });
  web.on("exit", (code) => {
    if (code && code !== 0) shutdown(code);
  });
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
