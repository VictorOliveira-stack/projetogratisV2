const express = require('express')
const app = express()
const port = 9000
const path = require('path')
const opener = require('opener');

const session = require('express-session')
const LokiStore = require('connect-loki')(session)


//handlebars
const handlebars = require('express-handlebars')


// Configuração do Handlebars
const hbs = handlebars.create({
    extname: '.handlebars',
    // Registra o novo helper
    helpers: {
        reverse: (array) => {
            if (!Array.isArray(array)) {
                return [];
            }
            // Retorna um novo array invertido, sem modificar o original
            return array.slice().reverse();
        },
        startsWith: function(str, prefix) {
            // Add a check to ensure 'str' is a valid string.
            // If it's not a string, return false to prevent the error.
            if (typeof str !== 'string' || str === null) {
                return false;
            }
            return str.startsWith(prefix);
        }
    }
    
});
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handelebars')



//parser midleware
app.use(
    express.urlencoded({
        extended: true
    })
)
app.use(express.json())// Middleware para parsear o corpo das requisições JSON

//Middleware de sessão
app.use(session({
    store: new LokiStore({}),
    secret: 'GodknifeTridentMouseLight',
    resave: false,
    cookie:{
        maxAge: 3600000 //1hora, mudar para 24hrs depois
    }
}))


//static views
app.use('/public', express.static(path.join(__dirname,'public')))



//routers
const router = require('./routers/routes.js')
const createtable = require("./routers/createtable.js")
    //vendas routers
    const vendas = require("./routers/vendastable.js")


//models
const userDb = require('./model/userDb.js')//db/tables user

//middlewares
app.use('/', router) //const router = require('./routers/routes.js')
app.use('/', createtable) //const criatetable = require("./routers/createtable.js")
    //middlewares vendas
    app.use('/', vendas)


app.get("/calculos",(req,res)=>{
    res.render("calculos.handlebars")
})


/*app.listen(port, ()=>{
    console.log(`rodando ${port}`)
})*/

app.listen(port, async (error)=>{
    console.log(`rodando ${port}`)

    opener(`http://localhost:${port}`);
    console.log(`Navegador aberto em http://localhost:${port}`);
    console.log(error)

})