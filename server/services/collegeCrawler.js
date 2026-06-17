import { chromium } from "playwright";

export class CollegeCrawler {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlPage(urlStr) {
    await this.initialize();
    
    // Create isolated context with custom settings
    const context = await this.browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CounselWebCrawler/1.0 (+https://counselweb.edu)",
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    const startTime = Date.now();

    try {
      console.log(`[Crawler] Navigating to: ${urlStr}`);
      const response = await page.goto(urlStr, {
        waitUntil: "domcontentloaded",
        timeout: 20000 // 20 seconds
      });

      const responseTime = Date.now() - startTime;
      const statusCode = response ? response.status() : null;
      const finalUrl = page.url();

      if (!response || statusCode >= 400) {
        await context.close();
        return {
          url: urlStr,
          finalUrl,
          statusCode,
          responseTime,
          crawlStatus: "failed",
          error: `HTTP Error: ${statusCode || "No Response"}`
        };
      }

      // Extract page details
      const title = await page.title();
      
      const metaDescription = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        return meta ? meta.getAttribute("content") || "" : "";
      });

      const html = await page.content();

      const text = await page.evaluate(() => {
        const body = document.querySelector("body");
        return body ? body.innerText.trim() : "";
      });

      // Extract and resolve absolute image URLs
      const images = await page.evaluate((currentUrl) => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs
          .map(img => {
            const src = img.getAttribute("src");
            if (!src) return "";
            try {
              return new URL(src, currentUrl).toString();
            } catch (e) {
              return "";
            }
          })
          .filter(src => src !== "" && src.startsWith("http"));
      }, finalUrl);

      // Unique images list
      const uniqueImages = Array.from(new Set(images));

      await context.close();

      return {
        url: urlStr,
        finalUrl,
        title: title ? title.trim() : "",
        metaDescription: metaDescription ? metaDescription.trim() : "",
        html,
        text,
        images: uniqueImages,
        statusCode,
        responseTime,
        crawlStatus: "success",
        error: null
      };

    } catch (err) {
      const responseTime = Date.now() - startTime;
      console.error(`[Crawler] Error crawling ${urlStr}: ${err.message}`);
      await context.close();
      return {
        url: urlStr,
        finalUrl: urlStr,
        statusCode: null,
        responseTime,
        crawlStatus: "failed",
        error: err.message
      };
    }
  }
}
