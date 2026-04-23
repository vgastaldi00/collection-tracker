// playwright.js
const { chromium } = require('playwright');

let browser;
let context;
let page;

async function initBrowser() {
  if (browser) return;

  browser = await chromium.launch({
    headless: false, // IMPORTANTE (cloudflare)
  });

  context = await browser.newContext();
  page = await context.newPage();

  console.log("🌐 Abrí manualmente el market y logeate...");
  await page.goto('https://mudream.online/market');

  // Espera larga para que el usuario pase Cloudflare
  await new Promise(res => setTimeout(res, 60000));

  console.log("✅ Sesión lista");
}

async function fetchGraphQL(payload) {
  if (!page) throw new Error("Browser no inicializado");

  return await page.evaluate(async (payload) => {
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    const text = await res.text();

    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, raw: text };
    }
  }, payload);
}

module.exports = {
  initBrowser,
  fetchGraphQL
};