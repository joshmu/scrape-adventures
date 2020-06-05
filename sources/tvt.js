const heroku = process.env.GSHEET_CLIENT_EMAIL ? true : false
const dev = process.argv[2] === 'dev'
const puppeteer = require('puppeteer')

//const url = 'https://www.tradingview.com/symbols/ETHUSD/technicals/'
const urlOrigin = 'https://www.tradingview.com/symbols'
const sleep = async t => new Promise(resolve => setTimeout(resolve, t));

const config = {
    headless: heroku ? true : false,
    slowMo: 0
}
const sourceId = 'tv'


module.exports = scrape = async (pairs) => {
    console.log('scraping tradingview.com technicals')

    // setup
    const browser = await puppeteer.launch({headless: config.headless, slowMo: config.slowMo, args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process', '--disable-gpu']})
    // '--disable-dev-shm-usage', '--single-process'
    // '--disable-gpu', '--no-sandbox', '--single-process', '--disable-web-security', '--disable-dev-profile'

    const page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 1000 }) // macbook pro 13' full screen

    // don't load images
    if (!heroku) {
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.resourceType() === 'image') {
                request.abort()
            } else {
                request.continue()
            }
        })
    }

    // go
    let data = []
    for (let i = 0; i < pairs.length; i++) {
        let p = pairs[i]
        let url = `${urlOrigin}/${p.toUpperCase()}/technicals/`

        await page.goto(url, {waitUntil: heroku ? 'networkidle' : 'networkidle2'})
        // await page.goto(url, {timeout: 60000})
        console.log(`url is ${url}`)

        // let the page load a bit manually
        let selector = '#technicals-root > div > div > div > div > span'
        if (heroku) {
            console.log('waiting 5s...')
            await sleep(4000)
        } else {
            await page.waitForSelector(selector)
        }

        let arr = await page.evaluate(s => {
            return Array.from(document.querySelectorAll(s)).map(x => x.innerText.toLowerCase())
        }, selector)

        let result = [{
            id: `${sourceId}o_${p}`,
            signal: arr[0]
        }, {
            id: `${sourceId}s_${p}`,
            signal: arr[2]
        }, {
            id: `${sourceId}ma_${p}`,
            signal: arr[3]
        }]
        console.log(result)

        data.push(result)
        console.log('2s rest...')
        await sleep(2000)
    }

    data = data.flat(1)

    await browser.close()
    return data
}

(async () => {
    if (dev) {
        console.log('DEV MODE')
        let pairs = ['btcusd', 'ethbtc', 'ethusd'];
        let output = await scrape(pairs)
        console.log(output)
    }
})()
