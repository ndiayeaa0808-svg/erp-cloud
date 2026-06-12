const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow = null;
let serverProcess = null;
const PORT = 3333;
const isDev = !app.isPackaged;

function getServerDir() {
  return isDev
    ? path.join(__dirname, "..")
    : path.join(process.resourcesPath, "app");
}

function loadEnv(serverDir) {
  const envPath = path.join(serverDir, ".env.local");
  const env = {};
  try {
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i === -1) continue;
        env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
  return env;
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout (30s)")), 30000);
    const poll = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/login`, (res) => {
        clearTimeout(timeout);
        res.resume();
        resolve();
      });
      req.on("error", () => setTimeout(poll, 300));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(poll, 300); });
    };
    poll();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const serverDir = getServerDir();
    const script = path.join(serverDir, "server-dist", "server.js");

    if (!fs.existsSync(script)) {
      return reject(new Error(`Serveur introuvable: ${script}`));
    }

    const envVars = loadEnv(serverDir);
    const childEnv = {
      ...process.env,
      ...envVars,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    };
    if (!isDev) childEnv.ELECTRON_RUN_AS_NODE = "1";

    serverProcess = spawn(
      process.execPath,
      [script],
      { cwd: serverDir, env: childEnv, stdio: ["pipe", "pipe", "pipe"] }
    );

    let output = "";
    serverProcess.stdout.on("data", (d) => { output += d; console.log("[next]", d.toString().trim()); });
    serverProcess.stderr.on("data", (d) => { output += d; console.error("[next:err]", d.toString().trim()); });
    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      serverProcess = null;
      reject(new Error(`Serveur arrêté (code=${code})\n${output.slice(-300)}`));
    });

    waitForServer().then(resolve).catch(reject);
  });
}

function showLoading(mw) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#268bd2" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>`;
  mw.loadURL(`data:text/html;charset=utf-8,
    <html style="height:100%;margin:0;background:#002b36;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,sans-serif">
    <div style="text-align:center;color:#93a1a1">
      <h1 style="color:#268bd2;font-weight:300;margin:0 0 8px">ERP Cloud</h1>
      <p style="margin:0 0 16px;font-size:14px">D&eacute;marrage du serveur...</p>
      <div style="width:40px;height:40px;margin:0 auto;border:3px solid #073642;border-top-color:#268bd2;border-radius:50%;animation:s 1s linear infinite"></div>
      <style>@keyframes s{to{transform:rotate(360deg)}}</style>
    </div></html>`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "ERP Cloud",
    icon: path.join(__dirname, "..", "public", "icons", "icon-512.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#002b36",
  });

  showLoading(mainWindow);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.on("did-fail-load", () => {
    setTimeout(() => { try { mainWindow?.loadURL(`http://127.0.0.1:${PORT}`); } catch {} }, 1500);
  });

  mainWindow.on("closed", () => { mainWindow = null; });
  return mainWindow;
}

async function main() {
  try {
    console.log("Starting ERP Cloud server...");
    const win = createWindow();
    await startServer();
    console.log("Server ready");
    win.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    console.error("Fatal:", err);
    dialog.showErrorBox("ERP Cloud", `Erreur au démarrage:\n${err.message}`);
    app.quit();
  }
}

app.whenReady().then(main);

app.on("window-all-closed", () => {
  serverProcess?.kill();
  serverProcess = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  serverProcess?.kill();
  serverProcess = null;
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});
