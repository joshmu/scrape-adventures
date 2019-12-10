const url = 'https://api.alternative.me/fng/'

const request = require('request-promise')
const options = {
  headers: {
    'user-agent': 'node.js'
  }
}

const sourceId = 'fg'

module.exports = getSignals;

async function getSignals() {
    console.log(url)

    let res = await request(url, options)
    let json = JSON.parse(res)
    // console.log('json', json)
    let data = [{
        id: sourceId,
        signal : json.data[0].value_classification.toLowerCase()
    }, {
        id: sourceId + '_index',
        signal: +json.data[0].value
    }]
    //console.log('data', data)

    return data
}
