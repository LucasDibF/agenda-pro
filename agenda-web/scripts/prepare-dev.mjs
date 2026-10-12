import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const nodeModules = path.join(root, "node_modules");
const nextPkg = path.join(nodeModules, "next", "package.json");

function ignoreIcloud(full) {
  if (process.platform !== "darwin") return;
  spawnSync("xattr", ["-w", "com.apple.fileprovider.ignore#P", "1", full], {
    stdio: "ignore",
  });
}

function ensureIgnoredDir(full) {
  fs.mkdirSync(full, { recursive: true });
  ignoreIcloud(full);
}

function canReadInstall() {
  if (process.env.PREPARE_DEV_FORCE === "1") return false;
  try {
    fs.readFileSync(nextPkg);
    const swcName = `@next/swc-${process.platform}-${process.arch}`;
    const swc = path.join(nodeModules, swcName, `next-swc.${process.platform}-${process.arch}.node`);
    if (!fs.existsSync(swc)) return process.platform !== "darwin";
    const fd = fs.openSync(swc, "r");
    const buf = Buffer.alloc(64);
    fs.readSync(fd, buf, 0, 64, 0);
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

ensureIgnoredDir(path.join(root, ".next.nosync"));

if (fs.existsSync(nodeModules)) {
  ignoreIcloud(nodeModules);
}

if (!canReadInstall()) {
  const stale = path.join(root, "node_modules.icloud-stale");
  if (fs.existsSync(nodeModules)) {
    const dest = fs.existsSync(stale) ? `${stale}-${Date.now()}` : stale;
    try {
      fs.renameSync(nodeModules, dest);
      console.warn(`[prepare-dev] node_modules no iCloud estava ilegivel. Movido para ${path.basename(dest)}.`);
    } catch (error) {
      console.error("[prepare-dev] nao consegui afastar o node_modules quebrado:", error.message);
      process.exit(1);
    }
  }

  ensureIgnoredDir(nodeModules);
  console.warn("[prepare-dev] reinstalando dependencias fora da sync do iCloud...");
  const result = spawnSync("npm", ["ci"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  ignoreIcloud(nodeModules);
}
