const heroku = process.env.GSHEET_CLIENT_EMAIL ? true : false
const puppeteer = require('puppeteer')
// const fs = require('fs')
const url = 'https://www.tradingview.com/crypto-screener/'
const sleep = async t => new Promise(resolve => setTimeout(resolve, t));

const config = {
    headless: heroku ? true : false,
    slowMo: 0
}
// let pairs = ['btcusd', 'ethbtc', 'ethusd'];
const sourceId = 'tv'


module.exports = scrape = async (pairs) => {
    console.log('scraping tradingview.com for signals')

    const browser = await puppeteer.launch({headless: config.headless, slowMo: config.slowMo, args: ['--no-sandbox', '--disable-setuid-sandbox']})
    const page = await browser.newPage()

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

    await page.setViewport({ width: 1200, height: 1000 }) // macbook pro 13' full screen

    await page.goto(url, {waitUntil: heroku ? 'networkidle' : 'networkidle2'})
    console.log(`url is ${url}`)
    console.log('applying settings...')

    let search = '#js-screener-container > div.tv-data-table-sticky-wrapper.tv-screener-sticky-header-wrapper > table > thead > tr > th.js-draggable.tv-data-table__th.tv-data-table__cell.js-tv-data-table-th.js-tv-data-table-th-name.tv-data-table__sortable.tv-screener-table__sortable.tv-screener-table__th > div > div > div.tv-screener-table__search-query.js-search-query.tv-screener-table__search-query--without-description > input'
    await page.waitForSelector(search)
    let elem = await page.$(search)

    let data = []

    console.log('grabbing data...')
    for(let i=0; i<pairs.length; i++) {
        console.log(pairs[i])

        await elem.press('Backspace')
        await elem.press('Backspace')
        await elem.press('Backspace')
        await elem.press('Backspace')
        await elem.press('Backspace')
        await elem.press('Backspace')
        await elem.press('Backspace')

        await elem.type(pairs[i], {delay: 50})

        await sleep(3000)

        const rowsSelector = '#js-screener-container > div.tv-screener__content-pane > table > tbody tr'
        let tvRows = await page.evaluate(rows => {
            return Array.from(document.querySelectorAll(rows)).map(function (tr) {
                return Array.from(tr.children).map(function (td) { return td.textContent.trim()})
            })
        }, rowsSelector)

        // console.log('tvRows', tvRows)
        let signals = tvRows.map(o => o[7]).reduce((p, c) => {
            if (p[c.toLowerCase()]) {
                p[c.toLowerCase()]++
            } else {
                p[c.toLowerCase()] = 1
            }
            return p
        }, {})
        // console.log('signals', signals)
        let outcome = Object.keys(signals).map(k => {
            let x = {
                id: pairs[i],
                signal: k,
                count: signals[k]
            }
            return x
        }).reduce((p,c) => {
            return p.count > c.count ? p : c
        }, { signal: 'neutral', count: 0 })
        // console.log('outcome', outcome)
        outcome.id = sourceId + '_' + outcome.id
        data.push(outcome)
    }


    await browser.close()
    return data
}
