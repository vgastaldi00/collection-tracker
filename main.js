const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;
let hiddenWindow;
let graphqlBody = null;

// ==============================
// PARSE SOURCE (SAFE VERSION)
// ==============================
function parseSource(source) {
  try {
    const bytes = Buffer.from(source, "hex");

    const optValue =
      bytes[16] |
      (bytes[17] << 8) |
      (bytes[18] << 16) |
      (bytes[19] << 24);

    const options = {
      dd: 0,
      dsr: 0,
      iml: 0,
      imsd: 0,
      rd: 0,
      izdr: 0
    };

    const ddVal = optValue & 0x0E;
    if (ddVal) options.dd = ddVal >> 1;

    const luck = (bytes[8] & 0x80) !== 0;

    return { options, luck };

  } catch (e) {
    return {
      options: {},
      luck: false
    };
  }
}

// ==============================
// WINDOWS
// ==============================
function createWindows() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  mainWindow.loadFile("index.html");

  hiddenWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: true // 🔥 importante: oculto

  });

  hiddenWindow.loadURL("https://mudream.online/market");

  // ==============================
  // CAPTURAR GRAPHQL
  // ==============================
  hiddenWindow.webContents.session.webRequest.onBeforeRequest(
    { urls: ["https://mudream.online/api/graphql*"] },
    (details, callback) => {
      try {
        if (details.uploadData?.length) {
          const raw = details.uploadData[0].bytes.toString();
          const parsed = JSON.parse(raw);

          if (parsed.operationName === "GET_ALL_LOTS") {
            graphqlBody = parsed;
            console.log("📦 BODY capturado");
          }
        }
      } catch (e) {}

      callback({});
    }
  );
}

// ==============================
// 🔔 FLASH WINDOW (NOTIFY)
// ==============================
ipcMain.on("flash-window", () => {
  if (!mainWindow) return;

  mainWindow.flashFrame(true);

  setTimeout(() => {
    if (mainWindow) mainWindow.flashFrame(false);
  }, 3000);
});

// ==============================
// SEARCH (INTOCABLE PERO LIMPIO)
// ==============================
ipcMain.handle("search-lots", async (_, payload) => {
  if (!graphqlBody) throw new Error("Market no listo");

  const { term, filters } = payload;

  const body = structuredClone(graphqlBody);

  const newFilter = {
    ...body.variables.filter,
    name: term
  };

  const OPTION_KEYS = ["dd", "dsr", "iml", "imsd", "rd", "izdr"];

  OPTION_KEYS.forEach(opt => {
    if (filters?.[opt]) {
      newFilter[opt] = [0, 1, 2, 3, 4];
    } else {
      delete newFilter[opt];
    }
  });

  if (filters?.hasLuck) {
    newFilter.hasLuck = true;
  } else {
    delete newFilter.hasLuck;
  }

  if (filters?.char) {
    newFilter[`for${filters.char}`] = true;
  }

  body.variables.filter = newFilter;

  const result = await hiddenWindow.webContents.executeJavaScript(`
    fetch("https://mudream.online/api/graphql", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(${JSON.stringify(body)})
    }).then(r => r.json())
  `);

  return result?.data?.lots?.Lots || [];
});

// ==============================
app.whenReady().then(createWindows);