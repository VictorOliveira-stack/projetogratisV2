//1
const sqlite3 = require('sqlite3').verbose();

const dbFile = 'UserDbOffline'    


//variaveis para criar banco de dados
const db = new sqlite3.Database(dbFile, (err)=>{
    if(err){
        console.log("erro ao criar o banco de dados", err.message)
    }else{
        console.log('conectado ao banco de dados com sucesso')
        //criar a tabela "users" se ela não existe
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`, (err)=>{
            if(err){
                console.log('erro ao criar a table: ', err.message)
            }else{
                console.log('table de usuarios criada ou ja existe')
            }
        })
    }
})

module.exports = db