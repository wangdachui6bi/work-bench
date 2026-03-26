const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('userData'), 'workbench-data');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:4173';
const PROD_INDEX_PATH = path.join(__dirname, '../dist/renderer/index.html');
const APP_ROUTES = [
  { key: 'dashboard', label: '仪表盘' },
  { key: 'todos', label: '待办事项' },
  { key: 'notes', label: '快捷笔记' },
  { key: 'passwords', label: '账号密码' },
  { key: 'bookmarks', label: '书签导航' },
  { key: 'pomodoro', label: '番茄钟' },
];

let mainWindow = null;
let tray = null;
let forceQuit = false;
let pendingNavigateKey = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(key) {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${key}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return null;
}

function writeStore(key, data) {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${key}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

async function sendFeishuBotMessage(payload) {
  const webhook = String(payload?.webhook || '').trim();
  const title = String(payload?.title || '工作台提醒').trim();
  const text = String(payload?.text || '').trim();

  if (!webhook) {
    throw new Error('飞书机器人 webhook 未配置');
  }

  if (!text) {
    throw new Error('提醒内容为空');
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      msg_type: 'text',
      content: {
        text: `${title}\n${text}`,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `飞书机器人请求失败: ${response.status}`);
  }

  const data = await response.json();
  if (data?.StatusCode && data.StatusCode !== 0) {
    throw new Error(data?.StatusMessage || '飞书机器人返回失败');
  }

  if (typeof data?.code === 'number' && data.code !== 0) {
    throw new Error(data?.msg || '飞书机器人返回失败');
  }

  return { ok: true };
}

function createTrayIcon() {
  const svg = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="14" height="14" rx="4" fill="black"/>
      <path d="M5 6.2H6.8L9 11.8L11.2 6.2H13L9.9 13H8.1L5 6.2Z" fill="white"/>
    </svg>
  `;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  image.setTemplateImage(true);
  return image;
}

function showWindow(targetKey = null) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createWindow();
  }

  if (targetKey) {
    pendingNavigateKey = targetKey;
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => {
        if (pendingNavigateKey) {
          mainWindow.webContents.send('app:navigate', pendingNavigateKey);
          pendingNavigateKey = null;
        }
      });
    } else {
      mainWindow.webContents.send('app:navigate', targetKey);
      pendingNavigateKey = null;
    }
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function hideWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: '打开 WorkBench',
      click: () => showWindow('dashboard'),
    },
    { type: 'separator' },
    ...APP_ROUTES.map((item) => ({
      label: item.label,
      click: () => showWindow(item.key),
    })),
    { type: 'separator' },
    {
      label: '隐藏窗口',
      click: () => hideWindow(),
    },
    {
      label: '退出',
      click: () => {
        forceQuit = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  if (tray) {
    return tray;
  }

  tray = new Tray(createTrayIcon());
  tray.setToolTip('WorkBench');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) {
      showWindow('dashboard');
      return;
    }

    hideWindow();
  });
  return tray;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
    console.error('[main] failed to load window', { code, description, validatedURL });
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render process gone', details);
  });

  win.webContents.on('did-finish-load', () => {
    if (pendingNavigateKey) {
      win.webContents.send('app:navigate', pendingNavigateKey);
      pendingNavigateKey = null;
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(PROD_INDEX_PATH);
  }

  win.on('close', (event) => {
    if (forceQuit || process.platform !== 'darwin') {
      return;
    }

    event.preventDefault();
    win.hide();
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

app.whenReady().then(() => {
  ipcMain.handle('store:get', (_event, key) => readStore(key));
  ipcMain.handle('store:set', (_event, key, data) => writeStore(key, data));
  ipcMain.handle('feishu:send', (_event, payload) => sendFeishuBotMessage(payload));

  createTray();
  mainWindow = createWindow();

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
    } else {
      showWindow('dashboard');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  forceQuit = true;
});
