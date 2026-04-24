const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const host = process.env.SSH_HOST;
const username = process.env.SSH_USER || "root";
const password = process.env.SSH_PASSWORD;

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({ host, username, password, readyTimeout: 15000 });
  });
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream.on("close", (code) => resolve({ code, stdout, stderr }));
      stream.on("data", (data) => { stdout += data.toString(); });
      stream.stderr.on("data", (data) => { stderr += data.toString(); });
    });
  });
}

function mkdirpSftp(sftp, remoteDir) {
  const parts = remoteDir.split("/").filter(Boolean);
  let current = "";
  return parts.reduce((promise, part) => promise.then(() => new Promise((resolve) => {
    current += `/${part}`;
    sftp.mkdir(current, () => resolve());
  })), Promise.resolve());
}

function put(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      mkdirpSftp(sftp, path.posix.dirname(remotePath))
        .then(() => sftp.fastPut(localPath, remotePath, (putErr) => {
          sftp.end();
          if (putErr) return reject(putErr);
          resolve();
        }))
        .catch(reject);
    });
  });
}

async function main() {
  const mode = process.argv[2];
  const conn = await connect();
  try {
    if (mode === "exec") {
      const result = await exec(conn, process.argv.slice(3).join(" "));
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      process.exitCode = result.code;
      return;
    }

    if (mode === "put") {
      await put(conn, process.argv[3], process.argv[4]);
      return;
    }

    throw new Error(`Unknown mode: ${mode}`);
  } finally {
    conn.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
