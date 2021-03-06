const heroku = process.env.TWITTER_PASSWORD ? true : false
const headless = process.argv[2] === 'headless'
const puppeteer = require('puppeteer')
// const fs = require('fs')
const url = 'https://www.twitter.com/login'
const sleep = async t => new Promise(resolve => setTimeout(resolve, t))

let twitterCreds
if (!heroku) {
    twitterCreds = require('../creds/twitterCreds.js')
} else {
    console.log('need to load in env variables for twitter creds')
    twitterCreds = {
        username: process.env.TWITTER_USERNAME,
        password: process.env.TWITTER_PASSWORD,
        email: process.env.TWITTER_EMAIL
    }
}

const defaultConfig = {
    search: ['vanity mirror', 'beauty mirror', 'beauty cosmetcs'],
    searchUrl: search => {
        return `https://twitter.com/search?q=${search.replace(
            /\s/g,
            '%20'
        )}&src=typed_query`
    },
    scrollAmount: 4,
    headless: heroku || headless ? true : false,
    slowMo: 0,
    id: 'twitter',
    loadImages: false,
    sleepTime: 3000,
    // proxy: '103.83.95.122:32896'
    proxy: false
}

module.exports = scrape = async userConfig => {
    const config = { ...defaultConfig, ...userConfig }

    console.log('socialising on twitter.com')

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
    await page.setRequestInterception(true)
    page.on('request', request => {
        if (request.resourceType() === 'image') {
            request.abort()
        } else {
            request.continue()
        }
    })

    await page.setViewport({ width: 1200, height: 1000 }) // macbook pro 13' full screen

    await page.goto('https://twitter.com/login')
    // await page.goto('https://twitter.com/login?username_disabled=true')

    // await page.goto(url, { waitUntil: heroku ? 'networkidle' : 'networkidle2' })
    console.log('URL:', page.url())

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
