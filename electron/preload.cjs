const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('autofvmcDesktop', {
  version: process.versions.electron,
  platform: process.platform,
})
