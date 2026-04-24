const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  searchLots: (payload) => {
    console.log("IPC SEND:", payload);
    return ipcRenderer.invoke("search-lots", payload);
  },
  flash: () => ipcRenderer.send("flash")
});