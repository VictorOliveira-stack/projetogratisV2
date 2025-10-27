const sqlite3 = require('sqlite3')
const tableproducts = "tableproducts"


const db = new sqlite3.Database(tableproducts,(err)=>{})

module.exports = db