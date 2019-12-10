const GoogleSpreadsheet = require('google-spreadsheet')
const moment = require('moment')
let creds;
// detect heroku launch relevant credentials
if (process.env.GSHEET_CLIENT_EMAIL) {
    console.log('using heroku config for gsheet access')
    creds = {
        client_email: process.env.GSHEET_CLIENT_EMAIL,
        private_key: process.env.GSHEET_PRIVATE_KEY
    }
} else {
    console.log('local json file for gsheet access')
    creds = require('./creds/client_secret.json')
}
// creds = require('./client_secret.json')

// signals-db spreadsheet url id
// spreadhsheet shared with full priveledge to:
// joshmu@gsheet-db.iam.gserviceaccount.com
const spreadsheet_id = '1GP7Zp7iWmmYMKwsSOUljjoaY5MIKMWUQ3x0mDwrjENM';
const signalsSheetIndex = 1;

module.exports.updateSignalsDB = updateSignalsDB;
async function updateSignalsDB(data) {
    return new Promise(async (resolve, reject) => {
        console.log('gsheet add:', data)

        // Create a document object using the ID of the spreadsheet - obtained from its URL.
        let doc = new GoogleSpreadsheet(spreadsheet_id)

        let rows = await db_getRows(doc, signalsSheetIndex)
        // console.log(`rows length is ${rows.length}`)
        // console.log(`date: ${rows[0].date}, btc: ${rows[0].btc}, eth: ${rows[0].eth}, usd: ${rows[0].usd}`)

        await db_addRow(doc, signalsSheetIndex, data)

        /*
        await db_addRow(doc, signalsSheetIndex, {
            date: timestamp.date,
            btcusd: signals.btcusd.daily,
            ethbtc: signals.ethbtc.daily,
            ethusd: signals.ethusd.daily,
            timestamp: timestamp.unix
        })
        */
        console.log('updated signals gsheet')
        resolve()
    })
}

module.exports.getSheetData = getSheetData;
async function getSheetData(index) {
    return new Promise(async (resolve, reject) => {

        // Create a document object using the ID of the spreadsheet - obtained from its URL.
        let doc = new GoogleSpreadsheet(spreadsheet_id)

        let rows = await db_getRows(doc, index)
        resolve(rows)
    })
}

async function db_addRow (doc, sheetIndex, data) {
    return new Promise((resolve, reject) => {
        // Authenticate with the Google Spreadsheets API.
        doc.useServiceAccountAuth(creds, function (err) {
            doc.addRow(sheetIndex, data, function(err) {
                if(err) {
                    console.error(err);
                    reject(err)
                }
                resolve()
            });
        })
    })
}

async function db_getRows (doc, sheetIndex) {
    return new Promise((res, rej) => {
        // Authenticate with the Google Spreadsheets API.
        doc.useServiceAccountAuth(creds, function (err) {
            if (err) rej(err)

            // Get all of the rows from the spreadsheet.
            doc.getRows(sheetIndex, function (err, rows) {
                if (err) {
                    rej(err)
                } else {
                    res(rows)
                }
            });

        })
    })
}
