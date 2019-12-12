/**
 * @name Instagram
 *
 * @desc Logs into Instagram with credentials. Provide your username and password as environment variables when running the script, i.e:
 * `INSTAGRAM_USER=myuser INSTAGRAM_PWD=mypassword node instagram.js`
 *
 */

const heroku = process.env.INSTAGRAM_PASSWORD ? true : false
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
;(async () => {
  const browser = await puppeteer.launch({
    headless: false
  })

  const page = await browser.newPage()

  // don't load images
  /*
  if (!heroku) {
    await page.setRequestInterception(true)
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        request.abort()
      } else {
        request.continue()
      }
    })
  }
  */
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

  await page.waitForSelector('.glyphsSpriteMobile_nav_type_logo')

  await page.screenshot({ path: screenshot })

  browser.close()
  console.log('See screenshot: ' + screenshot)
})()
