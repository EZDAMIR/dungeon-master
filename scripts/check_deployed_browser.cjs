// Playwright is installed separately by CD; it is not an application dependency.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

async function main() {
  const origin = process.argv[2];
  assert.match(origin, /^https:\/\/[a-zA-Z0-9.-]+$/);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      window.cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        window.cameraRequests += 1;
        throw new DOMException("Camera denied by smoke test", "NotAllowedError");
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", () => errors.push("Unhandled browser exception"));
    for (const route of ["/context", "/context/documents", "/context/review", "/plan", "/progress"]) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => document.querySelector("#root")?.textContent.length > 100);
      await page.reload();
      await page.waitForFunction(() => document.querySelector("#root")?.textContent.length > 100);
      assert.equal(await page.evaluate(() => window.isSecureContext), true);
      assert.equal(await page.evaluate(() => window.cameraRequests), 0);
    }
    await page.goto(origin + "/workout");
    await page.waitForURL(origin + "/plan");
    await page.goto(origin + "/results");
    await page.waitForURL(origin + "/progress");
    assert.deepEqual(errors, []);
    await context.close();
    console.log("Browser rendering, deep-link reloads, session guards and explicit camera access passed.");
  } finally {
    await browser.close();
  }
}

main().catch(() => {
  console.error("Deployed browser smoke failed.");
  process.exitCode = 1;
});
