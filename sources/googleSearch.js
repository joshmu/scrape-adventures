const dev = process.argv.includes('dev')
const headless = process.argv.includes('headless')
const puppeteer = require('puppeteer')
// const fs = require('fs')
const sleep = async t => new Promise(resolve => setTimeout(resolve, t))

const defaultConfig = {
  url: 'https://www.google.com/',
  search: ['josh mu', 'australia dance grant', 'contemporary dance residency'],
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

  await page.goto(config.searchUrl(config.search[0], config.numOfResults), {
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

  // todo: only last 2 years (or 1.5 years)
  console.log('URLS', urls)

  await sleep(60000)

  await page.waitForSelector('input')
  await page.type('input', 'josh mu')
  await page.waitFor(1000)
  await page.click('input[type="submit"]')
  ;('https://www.google.com/search?q=josh+mu')
  await sleep(60000)

  // Login
  await page.waitForSelector('input.js-username-field')
  await page.type(
    'input.js-username-field',
    page.url().includes('username=disabled')
      ? twitterCreds.email
      : twitterCreds.username
  )
  await page.type('input.js-password-field', twitterCreds.password)
  await page.click('button.submit')

  // await page.waitForNavigation()
  await sleep(config.sleepTime)
  console.log('URL:', page.url())

  let db = {
    tweets: 0,
    liked: 0,
    alreadyLiked: 0
  }

  for (let i = 0; i < config.search.length; i++) {
    await page.goto(config.searchUrl(config.search[i]))
    // await page.waitForNavigation()
    await sleep(config.sleepTime)
    console.log(`SEARCH: ${config.search[i]}`)
    console.log('URL:', page.url())

    // scroll the page down
    for (let i = 0; i < config.scrollAmount; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight)
      })
      await sleep(config.sleepTime / 2)
    }

    let response = await page.evaluate(() => {
      var data = {
        tweets: 0,
        liked: 0,
        alreadyLiked: 0
      }

      Array.from(
        document.querySelectorAll(
          'div:nth-child(3) > div > div > div:nth-child(1) > svg'
        )
      ).forEach(elem => {
        data.tweets++
        if (
          elem.parentNode.parentNode.parentNode.getAttribute('data-testid') ===
          'like'
        ) {
          console.log('like ✔️')
          elem.parentNode.firstChild.click()
          data.liked++
        } else {
          console.log('already liked...')
          data.alreadyLiked++
        }
      })
      return data
    })
    console.log('response', response)
    db.tweets += response.tweets
    db.liked += response.liked
    db.alreadyLiked += response.alreadyLiked
    await sleep(config.sleepTime / 2)
  }

  console.log('TOTAL')
  console.log(db)
  await browser.close()
  return db
}
scrape()
