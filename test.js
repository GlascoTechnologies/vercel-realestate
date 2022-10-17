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
let posts = [];
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
    page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36"
    );
    await page.goto(
      "https://housing.com/in/buy/nellore_andhra_pradesh/property-in-nellore_andhra_pradesh"
    );

    const pinks = [
      // "https://housing.com/in/buy/hyderabad/property-in-hyderabad",
      // "https://housing.com/in/buy/bangalore/property-in-bangalore",
      "    https://housing.com/in/buy/nellore_andhra_pradesh/property-in-nellore_andhra_pradesh",
      // "https://housing.com/in/buy/searches/M8vPwu793x91iyhc8fj",
      // "https://housing.com/in/buy/searches/M8vP5rv6o4tbbtqqsp3o",
    ];

    for (link of pinks) {
      await page.goto(link, {
        waitUntil: "networkidle2",
        timeout: 900000,
      });

      const items = await scrapeInfiniteScrollItems(page);

      console.log(items);
      console.log(items.length);

      for (link of items) {
        await page.goto(link, {
          waitUntil: "networkidle2",
          timeout: 900000,
        });

        console.log("Scraping-->", link);

        const extractedData = await page.evaluate(() => {
          let h1 = document.querySelector('h1[class="css-1hidc9c"]');

          if (!h1 || h1 == undefined || h1 === "" || h1 === null) {
            h1 = document.querySelector('div[class="css-1hidc9c"]');
          }
          let price = document.querySelector("span[class=css-19rl1ms]");

          if (!price || price === undefined || price === "") {
            price = document.querySelector("span[class=css-gg3jj9]");
          }
          let area = document.querySelector("div[class=css-1k19e3]");

          let address = document.querySelector("div[data-q=address]");
          let updated = document.querySelector("div[class=css-1iv3lhr]>div");
          let img = document.querySelector("img[class=css-40aejx]");
          return {
            h1: h1 ? h1.innerHTML : null,
            price: price ? price.innerText : null,
            area: area ? area.innerText : null,
            address: address ? address.innerHTML : null,
            updated: updated ? updated.innerHTML : null,
            img: img ? img.src : null,
          };
        });
        posts.push({
          url: link,

          h1: extractedData.h1,
          price: extractedData.price,
          area: extractedData.area,
          address: extractedData.address,
          updated: extractedData.updated,
          img: extractedData.img,
        });

        // const url = link;
        // const h1 = extractedData.h1;
        // const area = extractedData.area;
        // const price = extractedData.price;
        // const address = extractedData.address;
        // const updated = extractedData.updated;
      }
    }

    posts.push({ ScrapedDate: new Date() });
    console.log("output: ", posts);
    console.log("output: ", posts.length);
    await browser.close();
  } catch (err) {
    console.error(err);
    return null;
  }
})();

app.get("/check", async (req, res) => {
  await res.send("Working");
});
app.get("/items", async (req, res) => {
  await res.status(200).json(posts);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on 3000");
});

module.exports = app;
