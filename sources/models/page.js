const mongoose = require('mongoose')
const Schema = mongoose.Schema

const pageSchema = new Schema(
  {
    url: { type: String, required: true, unique: true },
    title: String,
    innerText: String
  },
  { timestamps: true }
)

module.exports = mongoose.model('Page', pageSchema)
