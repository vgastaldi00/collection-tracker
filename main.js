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

    // ✔ SOLO DD (100% confirmado)
    const ddVal = optValue & 0x0E;
    if (ddVal) options.dd = ddVal >> 1;

    // ✔ LUCK (100% confirmado)
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
// FORMAT LOT (NO FILTRO)
// ==============================
function formatLot(lot) {
  const parsed = parseSource(lot.source);

  const prices = lot.Prices || [];

  let priceStr = "no price";

  if (prices.length === 1) {
    const p = prices[0];

    if (p.Currency?.code === "dc") {
      priceStr = `${p.value} dc`;
    }

    if (p.Currency?.code === "zen") {
      priceStr = `${Math.floor(p.value / 1_000_000)}KK`;
    }
  }

  return {
    part: lot.type,
    options: parsed.options,
    luck: parsed.luck,
    price: priceStr
  };
}

// ==============================
// WINDOWS
// ==============================
function createWindows() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  mainWindow.loadFile("index.html");

  hiddenWindow = new BrowserWindow({
    show: true,
    width: 1200,
    height: 900
  });

  hiddenWindow.loadURL("https://mudream.online/market");

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
// SEARCH (INTOCABLE)
// ==============================
ipcMain.handle("search-lots", async (_, payload) => {
  if (!graphqlBody) throw new Error("Market no listo");

  const { term, filters } = payload;

  const body = structuredClone(graphqlBody);

  // --------------------------
  // BASE FILTER
  // --------------------------
  const newFilter = {
    ...body.variables.filter,
    name: term
  };

  // --------------------------
  // OPCIONES (FIX REAL)
  // --------------------------
  const OPTION_KEYS = ["dd", "dsr", "iml", "imsd", "rd", "izdr"];

  OPTION_KEYS.forEach(opt => {
    if (filters?.[opt]) {
      newFilter[opt] = [0, 1, 2, 3, 4]; // 🔥 CLAVE
    } else {
      delete newFilter[opt]; // 🔥 evita filtros viejos del body capturado
    }
  });

  // --------------------------
  // LUCK
  // --------------------------
  if (filters?.hasLuck) {
    newFilter.hasLuck = true;
  } else {
    delete newFilter.hasLuck;
  }

  // --------------------------
  // CHARACTER (opcional)
  // --------------------------
  if (filters?.char) {
    newFilter[`for${filters.char}`] = true;
  }

  body.variables.filter = newFilter;

  // --------------------------
  // REQUEST REAL
  // --------------------------
  const result = await hiddenWindow.webContents.executeJavaScript(`
    fetch("https://mudream.online/api/graphql", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(${JSON.stringify(body)})
    }).then(r => r.json())
  `);

  const lots = result?.data?.lots?.Lots || [];

  return lots;
});

app.whenReady().then(createWindows);