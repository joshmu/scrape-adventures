// //////////////////
// SOCIAL BOT
// Version: 1.0
// 10/12/2019
// By Josh Mu
// //////////////////

const dev = process.argv[2] === 'dev'
if (dev) console.log('dev mode is on...')
// detect heroku env
let heroku = false
if (process.env.TWITTER_PASSWORD) {
  console.log('HEROKU ENVIRONMENT')
  heroku = true
} else {
  console.log('\nLOCAL MACHINE ENVIRONMENT')
}

// const gsheet = require('./gsheet.js')
const moment = require('moment')
const sendmail = require('sendmail')({ silent: true })
//const getAlfSignals = require('./getAlfSignals.js') // ACCESS AND FIX WHEN REQUIRED LOCATED IN 'ARCHIVE'

////////////////////
// SETUP
////////////////////
// const scrape_investing = require('./sources/investing.js')
// const scrape_tv = require('./sources/tradingView.js')
// const scrape_fg = require('./sources/fearGreed.js')
// const scrape_tvt = require('./sources/tvt.js')
const twitterBot = require('./sources/twitterBot.js')

const timeDiff = heroku ? +process.env.TIMEDIFF_GMT || 8 : 0 // GMT +10 for Melbourne
const appStartTime = moment().add(timeDiff, 'hours')

let config = {
  notification: {
    // when to send notification for am and pm
    am: +process.env.NOTIFICATION_AM || 8,
    pm: +process.env.NOTIFICATION_PM || 20,
    enabled: false
  },
  timestamp: {
    date: appStartTime.format('DD/MM/YY h:mm:ssa'),
    unix: appStartTime.format('x')
  }
}

////////////////////
// INIT
////////////////////
;(async () => {
  console.log(`\nSOCIAL BOT...\n`)

  // initial start up
  console.log(appStartTime.format('DD/MM/YY h:mm:ssa'))
  // console.log(config.timestamp.date)
  console.log(`time diff is ${timeDiff} hours`)

  // notifications
  if (config.notification.enabled) {
    console.log(
      `notifications set for ${config.notification.am} & ${config.notification.pm}`
    )
  }

  ////////////////////
  // GET
  ////////////////////
  // get signals for for btc/usd, eth/btc and eth/usd
  console.log(`\nSocialising...`)
  let data = {
    date: config.timestamp.date,
    timestamp: config.timestamp.unix
  }

  // SOURCE 1 - TWITTER.COM
  try {
    let response = await twitterBot()
    data.twitter = response
  } catch (e) {
    catchMsg('ERROR: TWITTER.COM', e)
  }

  ////////////////////
  // SAVE
  ////////////////////
  //   try {
  //     // add signals to gsheet
  //     await gsheet.updateSignalsDB(data)

  //     // add alf signals
  //     /*
  //         let alfData = await getAlfSignals()
  //         console.log('\nALF')
  //         console.log(alfData)
  //         signals.btcusd.alfSt = alfData.signals.st
  //         signals.btcusd.alfMt = alfData.signals.mt
  //         signals.btcusd.alfLt = alfData.signals.lt
  //         */
  //   } catch (e) {
  //     catchMsg('ERROR: GSHEET', e)
  //   }

  ////////////////////
  // NOTIFY
  ////////////////////
  // send summary at a specific time
  let currentHour = +moment()
    .add(timeDiff, 'hours')
    .format('H')
  console.log('current hour is', currentHour)
  // 9am on HEROKU = 5pm in current location > 8 hours plus difference
  if (
    (currentHour === config.notification.am ||
      currentHour === config.notification.pm) &&
    config.notification.enabled
  ) {
    console.log('notification initiated...')
  } else {
    console.log('notification not required.')
  }

  ////////////////////
  // END
  ////////////////////
  let duration = appStartTime.add(-timeDiff, 'hours').toNow(moment())
  console.log('\nFINISHED in', duration)

  process.exit(0)
  return
})()

function catchMsg(subj, e) {
  console.log(subj)
  console.log(e)
  email(subj, e.toString())
}

async function email(subject, body) {
  return new Promise((resolve, reject) => {
    sendmail(
      {
        from: 'info@signalsearch.com',
        // to: 'joshmu.crypto@gmail.com',
        to: 'mu@joshmu.com',
        subject: subject,
        text: body
      },
      function(err, reply) {
        if (err) console.error(err)
        // console.log(err && err.stack)
        // console.dir(reply)
        console.log('email sent')
        resolve()
      }
    )
  })
}
