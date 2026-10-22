const { app, BrowserWindow, dialog } = require('electron')
const path = require('node:path')

let mainWindow

function startBacnetBridge() {
  process.env.AUTOFVMC_PORT = process.env.AUTOFVMC_PORT || '47880'
  require('../server/bacnetServer.cjs')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#edf1f4',
    title: 'AutoFVMC AI',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const devUrl = process.env.AUTOFVMC_DEV_URL
  mainWindow.loadURL(devUrl || `file://${path.join(__dirname, '..', 'dist', 'index.html')}`)
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

app.whenReady().then(() => {
  startBacnetBridge()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('render-process-gone', (_event, _webContents, details) => {
  if (details.reason !== 'clean-exit') dialog.showErrorBox('AutoFVMC renderer stopped', details.reason)
})
