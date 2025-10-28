// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged; // 打包后为 false

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#1a1a1a',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true
    }
  });

  if (isDev) {
    // Vite 本地服务
    win.loadURL('http://localhost:5173/');
    // win.webContents.openDevTools();
  } else {
    // 生产：加载打包后的 index.html
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
