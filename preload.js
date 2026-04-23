const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  searchLots: (term) => ipcRenderer.invoke("search-lots", term)
});