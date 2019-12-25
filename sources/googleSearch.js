const dev = process.argv.includes('dev')
const headless = true || process.argv.includes('headless')
const puppeteer = require('puppeteer')
const { Cluster } = require('puppeteer-cluster')
const fs = require('fs')
const sleep = async t => new Promise(resolve => setTimeout(resolve, t))

const mongoose = require('mongoose')
const dbUrl = 'mongodb://127.0.0.1:27017/dance'
const Page = require('./models/page.js')

const savePage = async pageData => {
  try {
    let p = new Page(pageData)
    let output = await p.save()
    console.log('saved:', output.url)
  } catch (e) {
    console.error('ERROR:', e.errmsg)
  }
}

const getDB = async mongoose => {
  return new Promise((resolve, reject) => {
    mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true
    })
    const db = mongoose.connection
    db.once('open', _ => {
      console.log('Database connected:', dbUrl)

      resolve(db)
    })

    db.on('error', err => {
      console.error('connection error:', err)
    })
  })
}

let DATA = require('../grantResults.json') || []

const defaultConfig = {
  url: 'https://www.google.com/',
  search: [
    'dance funding',
    'dance grant',
    'dance residency',
    'dance commission',
    'contemporary dance choreography application',
    'contemporary choreography funding',
    'contemporary choreography commission',
    'contemporary choreography application',
    'contemporary dance application'
  ],
  searchTokens: [
    'residency',
    'apply',
    'commission',
    'fully funded',
    'fellowship'
  ],
  blacklist: ['student', 'youth', 'study'],
  numOfResults: 100,
  searchUrl: (search, num) => {
    return `https://www.google.com/search?tbs=qdr%3Ay&q=${search.replace(
      /\s/g,
      '+'
    )}&num=${num}`
  }, // 'tbs=qdr%3Ay' is for past year search
  scrollAmount: 4,
  headless: dev || headless ? true : false,
  slowMo: 0,
  id: 'google',
  noImages: false,
  sleepTime: 3000,
  // proxy: '103.83.95.122:32896'
  proxy: false
}

module.exports = scrape = async userConfig => {
  const config = { ...defaultConfig, ...userConfig }

  let db = await getDB(mongoose)

  console.log(config.id.toUpperCase())

  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      config.proxy ? `--proxy-server=${config.proxy}` : ``
    ]
  })
  const page = await browser.newPage()

  const setupPage = async (page, config) => {
    return new Promise(async (resolve, reject) => {
      // don't load images
      if (!config.noImages) {
        await page.setRequestInterception(true)
        page.on('request', request => {
          if (request.resourceType() === 'image') {
            request.abort()
          } else {
            request.continue()
          }
        })
      }
      await page.setViewport({ width: 1200, height: 1000 }) // macbook pro 13' full screen
      resolve()
    })
  }
  await setupPage(page, config)

  let searchPromises = config.search.map(query => {
    return new Promise(async (resolve, reject) => {
      try {
        let page = await browser.newPage()

        await setupPage(page, config)
        await page.goto(config.searchUrl(query, config.numOfResults), {
          waitUntil: 'networkidle2'
        })
        // await page.goto(url, { waitUntil: dev ? 'networkidle' : 'networkidle2' })

        console.log('URL:', page.url())

        let urls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('div#search a'))
            .filter(anchor => anchor.innerHTML.includes('h3'))
            .map(anchor => {
              return {
                title: anchor.firstChild.innerText,
                url: anchor.href
              }
            })
        })

        console.log('URLS', urls)
        urls.forEach(item => (item.query = query))
        resolve(urls)

        await page.close()
      } catch (e) {
        page.close()
        reject(e)
      }
    })
  })

  let sources = await Promise.all(searchPromises)
  sources = sources.flat()
  console.log('SOURCES\n\n')
  console.log(sources)

  await browser.close()

  // check for new sources or overwrites
  // delete DATA entries if new searches are required
  console.log('DATA length:', DATA.length)
  console.log('delete data entries...')
  DATA = DATA.filter(d => {
    return config.searchTokens.every(t =>
      Object.keys(d.matches).some(k => t === k)
    )
  })
  console.log('DATA length:', DATA.length)
  // new sources
  console.log('sources length:', sources.length)
  console.log('updating required sources...')
  sources = sources.filter(s => {
    return DATA.every(d => d.url !== s.url)
  })
  console.log('sources length:', sources.length)

  // CHECK SOURCES
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 10
  })

  await cluster.task(async ({ page, data }) => {
    await setupPage(page, config)
    await page.goto(data.url, {
      waitUntil: 'networkidle2'
    })
    console.log(`${data.idx + 1}/${sources.length}`)
    console.log(data.title)
    console.log('URL:', page.url())
    let text = await page.evaluate(() => {
      return document.querySelector('body').innerText
    })

    // add page data
    await savePage({
      title: data.title,
      url: data.url,
      innerText: text
    })

    let matches = await searchSource(text, config.searchTokens)
    DATA.push({ ...data, matches })
    console.log('matches:', matches)
  })

  sources.forEach((s, idx) => cluster.queue({ ...s, idx }))

  await cluster.idle()
  await cluster.close()

  DATA = DATA.sort((prev, curr) => {
    let prevTotal = Object.keys(prev.matches).reduce((p, c) => {
      return p + prev.matches[c]
    }, 0)
    let currTotal = Object.keys(curr.matches).reduce((p, c) => {
      return p + curr.matches[c]
    }, 0)
    return currTotal - prevTotal
  })

  // remove duplicates
  DATA = removeDups(DATA)

  // renumber idx
  DATA = DATA.map((d, idx) => {
    d.idx = idx
    return d
  })

  fs.writeFileSync('grantResults.json', JSON.stringify(DATA))

  return DATA
}
scrape()

const searchSource = async (searchString, searchTokens) => {
  return new Promise((resolve, reject) => {
    // create object of searchToken keys with match amount and return
    let matches = {}

    searchTokens.forEach(t => {
      let searchRegex = new RegExp(t, 'gi')
      let numOfMatches = searchString.match(searchRegex)
      matches[t] = numOfMatches ? numOfMatches.length : 0
    })

    resolve(matches)
  })
}

/*
const searchSourceOld = async (searchString, searchTokens) => {
  return new Promise((resolve, reject) => {
    // console.log(searchString)
    // console.log('searching source...')
    searchRegex = new RegExp(searchTokens.join('|'), 'gi')
    numOfMatches = searchString.match(searchRegex)
    // console.log(numOfMatches)
    resolve(numOfMatches ? numOfMatches.length : 0)
  })
}
*/

const removeDups = data => {
  let unique = []
  data.forEach(d => {
    if (unique.filter(u => u.url === d.url).length) {
      console.log('removing duplicate:', d.title)
    } else {
      unique.push(d)
    }
  })
  return unique
}
