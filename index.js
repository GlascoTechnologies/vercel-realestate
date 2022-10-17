const app = require("express")();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

const scrapeInfiniteScrollItems = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  const items = await page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll(
        "article[class=css-1nr7r9e]>div>div>div[class=css-2rx1iy]>a[class=css-15n0x03]"
      )
    );
    return items.map((item) => item.href);
  });
  console.log("supopop", items.length);
  return items;
};

let nu = 0;
(async () => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let browser = await puppeteer.launch(options);

    let page = await browser.newPage();
    // page.setUserAgent(
    //   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36"
    // );
    await page.setExtraHTTPHeaders({
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36",
      "upgrade-insecure-requests": "1",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "en-US,en;q=0.9,en;q=0.8",
    });
    await page.goto(
      "https://housing.com/in/buy/nellore_andhra_pradesh/property-in-nellore_andhra_pradesh"
    );

    const items = await scrapeInfiniteScrollItems(page);
    // res.send(await page.title());

    nu = items;
    app.get("/num", async (req, res) => {
      res.json(nu);
    });
  } catch (err) {
    console.error(err);
    return null;
  }
})();

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on 3000");
});

module.exports = app;
