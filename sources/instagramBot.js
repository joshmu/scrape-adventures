/**
 * @name Instagram
 *
 * @desc Logs into Instagram with credentials. Provide your username and password as environment variables when running the script, i.e:
 * `INSTAGRAM_USER=myuser INSTAGRAM_PWD=mypassword node instagram.js`
 *
 */

const heroku = process.env.INSTAGRAM_PASSWORD ? true : false

const likesLimit = 40

let creds
if (!heroku) {
    creds = require('../creds/instagramCreds.js')
} else {
    console.log('need to load in env variables for creds')
    creds = {
        username: process.env.INSTAGRAM_USERNAME,
        password: process.env.INSTAGRAM_PASSWORD,
        email: process.env.INSTAGRAM_EMAIL
    }
}
const puppeteer = require('puppeteer')
const screenshot = 'instagram.png'

const random = (min, max) => {
    return Math.floor(Math.random() * (+max - +min)) + +min;
}
const sleep = async t => new Promise(resolve => setTimeout(resolve, t))

module.exports = async () => {
    const browser = await puppeteer.launch({
        headless: false
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

    await page.goto(
        'https://www.instagram.com/accounts/login/?source=auth_switcher',
        {
            waitUntil: 'networkidle2'
        }
    )

    //email
    await page.waitForSelector("[name='username']")
    // await page.click("[name='username']");
    await page.type("[name='username']", creds.username)

    //password
    await page.keyboard.down('Tab')
    //uncomment the following if you want the passwor dto be visible
    // page.$eval("._2hvTZ.pexuQ.zyHYP[type='password']", (el) => el.setAttribute("type", "text"));
    await page.keyboard.type(creds.password)

    //the selector of the "Login" button
    // await page.click("._0mzm-.sqdOP.L3NKy>.Igw0E.IwRSH.eGOV_._4EzTm");

    //we find the Login btn using the innerText comparison because the selector used for the btn might be unstable
    await page.evaluate(() => {
        let btns = [...document.querySelector('.HmktE').querySelectorAll('button')]
        btns.forEach(function(btn) {
            if (btn.innerText == 'Log In') btn.click()
        })
    })

    //Optional
    //check if the element asking to download the app arises
    // try {
    // 	await loginPage.waitForSelector("._3m3RQ._7XMpj",{
    // 		timeout:3000
    // 	});
    // 	await loginPage.click("._3m3RQ._7XMpj");
    // } catch (err) {

    // }

    //Optional
    //check if the app asks for notifications
    // try {
    // 	await loginPage.waitForSelector(".aOOlW.HoLwm",{
    // 		timeout:5000
    // 	});
    // 	await loginPage.click(".aOOlW.HoLwm");
    // } catch (err) {

    // }

    // await page.waitForSelector('.glyphsSpriteMobile_nav_type_logo')
    await sleep(random(2000, 4000))

    // NEW

    let likes = 0
    await page.goto('https://www.instagram.com/explore/tags/cosmetics/')
    // await page.waitForNavigation()
    await sleep(random(2000, 4000))
    await page.click('#react-root > section > main > article > div > div > div > div:nth-child(1) > div:nth-child(1)')
    await sleep(random(1000, 2000))
    await page.click('span[aria-label="Like"]')
    likes++
    while (likes < likesLimit) {
        await page.keyboard.press("ArrowRight", {delay: 50})
        await sleep(random(2000, 4000))
        if (Math.random() > 0.15) {
            try {
                await page.click('span[aria-label="Like"]')
                likes++
                console.log(`${likes} liked`)
            } catch (e) {
                console.error(e)
                console.log('skipped')
            }
        } else {
            console.log('skipped')
        }
    }
    console.log('instagram likes complete.')

    // #react-root > section > main > article > div > div > div > div:nth-child(1) > div:nth-child(1)
    // goto pages to like shit
    //https://www.instagram.com/explore/tags/cosmetics/
    // like button span[aria-label="Like"]
    //document.querySelector('span[aria-label="Like"]').click()
    // if = "Unlike" then do not click
    // body > div > div > div > article > div > section > span > button > span
    //document.querySelector('body > div > div > div > article > div > section > span > button > span')
    //document.querySelector('body > div > div > div > article > div > section > span > button > span').getAttribute('aria-label') === 'Unlike'
    //then click it

    //await page.screenshot({ path: screenshot })

    browser.close()
    //console.log('See screenshot: ' + screenshot)
}

