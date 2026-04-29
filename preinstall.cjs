const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const lockfiles = ["package-lock.json", "yarn.lock"];

for (const file of lockfiles) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
