// Windows desktop shell for the Al-Amen app: a window around the web app that
// is already hosted at al-amen.com/app/, so it always shows the latest version
// and the forum's own forum.php proxy works (same site, no CORS problems).
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const APP_URL = 'https://www.al-amen.com/app/';
const APP_ORIGIN = new URL(APP_URL).origin;

function isAppPage(url) {
  try {
    const u = new URL(url);
    return u.origin === APP_ORIGIN && u.pathname.startsWith('/app/');
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 380,
    minHeight: 500,
    backgroundColor: '#0f2540',
    title: 'شبكة الأمين السلفية',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  // Links outside the app (YouTube, the forum for replying, email...) open in the
  // default browser; the app's own pages stay in the window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppPage(url) && !url.startsWith('file:')) {
      event.preventDefault();
      if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
    }
  });

  // No connection: show a page with a retry button.
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'));
  });

  win.loadURL(APP_URL);
}

// One window only: opening the app again focuses the existing one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  Menu.setApplicationMenu(null);
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
