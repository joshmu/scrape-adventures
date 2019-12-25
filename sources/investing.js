const URLS = {
  ethbtc: 'https://www.investing.com/currencies/eth-btc?cid=1001806', // cid is the bitfinex source id
  ethusd: 'https://www.investing.com/crypto/ethereum/eth-usd?cid=997650', // bitfinex source id
  btcusd: 'https://www.investing.com/crypto/bitcoin/btc-usd', // bitfinex is default
  ltcbtc: 'https://www.investing.com/currencies/ltc-btc?cid=1031693', // binance source id
  nanobtc: 'https://www.investing.com/crypto/neo/neo-btc?cid=1031691', // binance
  nanousd: 'https://www.investing.com/crypto/nano/nano-usd?cid=1069506', // kucoin
  neobtc: 'https://www.investing.com/crypto/neo/neo-btc?cid=1031691', // binance
  neousd: 'https://www.investing.com/crypto/neo/neo-usd?cid=1054929' // bitfinex
}

const cheerio = require('cheerio')
const request = require('request-promise')
const options = {
  headers: {
    'user-agent': 'node.js'
  }
}
const selector = '#leftColumn > table.genTbl.closedTbl.technicalSummaryTbl > tbody > tr:nth-child(3) td'
const sourceId = 'invest'

module.exports = getSignals;

async function getSignals(list) {

    let scraped = list.map(ticker => {
        return new Promise(async (res, rej) => {
            try {
                console.log(ticker)
                let signal = await scrape(ticker.slice(0,3),ticker.slice(3))
                res({id: sourceId + '_' + ticker, signal: signal})
            } catch (e) {
                rej(e)
            }
        })
    })

    let signals = await Promise.all(scraped)
    return signals

    /*
    let signals = {}
    try {
        signals.btcusd = await scrape('btc', 'usd')
        console.log('btcusd')
        console.log(signals.btcusd)
        signals.ethusd = await scrape('eth', 'usd')
        console.log('ethusd')
        console.log(signals.ethusd)
        signals.ethbtc = await scrape('eth', 'btc')
        console.log('ethbtc')
        console.log(signals.ethbtc)
    } catch (e) {

    }
    */
}

async function scrape (symbol, base) {
  return new Promise(async (resolve, reject) => {
    let urlKey = symbol.toLowerCase() + base.toLowerCase()
    const url = URLS[urlKey] || 'https://www.investing.com/currencies/' + symbol.toLowerCase() + '-' + base.toLowerCase()
    // console.log(url)

    let html = await request(url, options)

    let $ = cheerio.load(html)
    let list = $(selector).map((i, elem) => $(elem).text().toLowerCase()).get()

    // remove 'summary' text
    list.shift()

    let output = {
      '5min': list[0],
      '15min': list[1],
      'hourly': list[2],
      'daily': list[3],
      'monthly': list[4]
    }

    resolve(output)
  })
}
