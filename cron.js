const twitterBot = require('./sources/twitterBot.js')
const instagramBot = require('./sources/instagramBot.js')

const fs = require('fs')
const moment = require('moment')
const timeLog = require('./timeLog.json')

const CronJob = require('cron').CronJob

console.log(`STARTING CRON...`)
const job = new CronJob('0 */15 * * * *', async () => {
    // every second hour
    // seconds / minutes / hours / daysOfMonth / month / dayOfWeek
    const minutes = moment().diff(moment(timeLog.twitter), 'minutes')
    console.log(`twitter > minutes passed: ${minutes}`)
    if (minutes >= 100) {
        console.log('time to init')
        await twitterBot()
        timeLog.twitter = new Date()
        fs.writeFileSync('./timeLog.json', JSON.stringify(timeLog))
    }

})
job.start()

const job2 = new CronJob('0 */15 * * * *', async () => {
    // every second hour at 10 min past
    // seconds / minutes / hours / daysOfMonth / month / dayOfWeek
    // minutes diff is
    const minutes = moment().diff(moment(timeLog.twitter), 'minutes')
    console.log(`instagram > minutes passed: ${minutes}`)
    if (minutes >= 100) {
        console.log('time to init')
        await instagramBot()
        timeLog.instagram = new Date()
        fs.writeFileSync('./timeLog.json', JSON.stringify(timeLog))
    }
})
job2.start()
