const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  // 🔎 SEARCH
  searchLots: (payload) => ipcRenderer.invoke("search-lots", payload),

  // 🔔 FLASH (barra de Windows)
  flash: () => ipcRenderer.send("flash-window")

});