const fs = require("fs");
const { spawnSync } = require("child_process");

const envPath = process.argv[2] || ".env";
const outPath = process.argv[3];

if (!outPath) {
  console.error("Missing output path");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
    })
);

const url = new URL(env.DATABASE_URL);
const args = [
  `--host=${url.hostname}`,
  `--port=${url.port || "3306"}`,
  `--user=${decodeURIComponent(url.username)}`,
  decodeURIComponent(url.pathname.slice(1)),
];

const output = fs.openSync(outPath, "w", 0o600);
const result = spawnSync("mysqldump", args, {
  stdio: ["ignore", output, "inherit"],
  env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
});
fs.closeSync(output);

process.exit(result.status || 0);
