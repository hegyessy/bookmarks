import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = Deno.env.get("BOOKMARKS_URL") || "http://127.0.0.1:4000";

for (const engine of [chromium, webkit]) {
  Deno.test(`${engine.name()}: search, clear, links, and narrow layout`, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base);
      const search = page.getByRole("searchbox", { name: "Search bookmarks" });
      await search.waitFor();
      await page.waitForFunction(() => document.activeElement?.id === "search");
      assert.equal(await page.title(), "Bookmarks");
      const links = page.locator("#bookmarks a");
      assert.equal(await links.count(), 18);
      const titles = await page.locator(".bookmark-title").allTextContents();
      assert.deepEqual(titles, [...titles].sort());

      await search.fill("HODINKEE");
      await search.press("Enter");
      await page.waitForURL("**/?q=HODINKEE");
      assert.equal(await links.count(), 2);
      assert.equal(await search.inputValue(), "HODINKEE");

      // Catch the target and cancel navigation so this test never visits the site.
      await page.context().route(
        "https://hodinkee.com/",
        (route) =>
          route.fulfill({
            status: 200,
            contentType: "text/html",
            body: "<title>Bookmark target</title>",
          }),
      );
      const popupPromise = page.waitForEvent("popup");
      await page.getByRole("link", {
        name: "Hodinkee https://hodinkee.com",
        exact: true,
      }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      assert.equal(popup.url(), "https://hodinkee.com/");
      assert.equal(
        await popup.evaluate(() => globalThis.opener === null),
        true,
      );
      await popup.close();

      await search.fill("");
      await page.waitForURL(`${base}/`);
      assert.equal(await links.count(), 18);
      await search.fill("no matching bookmark");
      await search.press("Enter");
      await page.waitForURL("**/?q=no+matching+bookmark");
      assert.equal(await links.count(), 0);
      await search.fill("");
      await page.waitForURL(`${base}/`);

      await page.setViewportSize({ width: 375, height: 812 });
      assert.equal(await links.count(), 18);
      assert.equal(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= globalThis.innerWidth
        ),
        true,
      );
      const screenshotDir = Deno.env.get("BOOKMARKS_SCREENSHOTS");
      if (screenshotDir) {
        await Deno.mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          path: `${screenshotDir}/${engine.name()}-mobile.png`,
          fullPage: true,
        });
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.screenshot({
          path: `${screenshotDir}/${engine.name()}-desktop.png`,
          fullPage: true,
        });
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  Deno.test(`${engine.name()}: search works without JavaScript`, async () => {
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ javaScriptEnabled: false });
      await page.goto(base);
      const search = page.getByRole("searchbox", { name: "Search bookmarks" });
      await search.fill("American Express (amex)");
      await search.press("Enter");
      await page.waitForURL("**/?q=American+Express+%28amex%29");
      assert.equal(await page.locator("#bookmarks a").count(), 1);
      assert.equal(
        await page.locator("#bookmarks a").getAttribute("href"),
        "https://americanexpress.com",
      );
      await search.fill("");
      await search.press("Enter");
      await page.waitForURL("**/?q=");
      assert.equal(await page.locator("#bookmarks a").count(), 18);
    } finally {
      await browser.close();
    }
  });
}
