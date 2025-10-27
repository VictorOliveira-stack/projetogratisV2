const express = require('express')
const router = express.Router()
const  userDb = require('../model/userDb.js')//se precisar retirar o comentario
//const functionuserDb = require('../model/userDb.js')
//const userDb = functionuserDb() //aqui acabou sendo importado como function em vez de ser um objeto pois na rota userDb.js ele era uma function importar como objeto estava dando erro

console.log(userDb)
const bcrypt = require('bcryptjs')

router.use(express.urlencoded({ extended: true }));

// Middleware para processar dados em JSON
router.use(express.json());


const fs = require('fs')

const FLAG_FILE = 'flag.txt';

const Flag = (req,res, next)=>{
    if (fs.existsSync(FLAG_FILE)) {
    // Se a flag existe, o registro já foi feito. Redirecione.
    console.log('Flag de registro encontrada. Redirecionando para a página inicial.');
    return res.redirect('/');
    } next()
}

const isAuthenticated = (req, res, next)=>{
    if(req.session.user){
        //verifica se há um usuario na sessão
        return next()
    }
    res.redirect('/login') //Se não houver, iria direcionar para a pagina de login
}

       

//inicio
router.get('/', (req,res)=>{
    res.render('init.handlebars')
})


//register
router.get('/register', Flag, (req,res)=>{
    res.render('register.handlebars')
})

router.post('/register',Flag, (req,res)=>{
    const {user, password} = req.body

    if(!user || !password){
        return res.status(400).send('nome de usuario e senha são obrigatorios')
    }

    bcrypt.hash(password, 10, (err, hashedPassword)=>{

        if(err){
            console.error('erro ao criar a senha', err.message)
            return res.status(500).send('erro interno do servidor')
        }

        userDb.run(`INSERT INTO users (user, password) VALUES (?, ?)`, [user, hashedPassword], function(err){
            if(err){
                console.error("error ao criar a senha", err.message)
                return res.status(500).send('error ao registrar usuario.')
            }
                console.log(`usuario '${user}' registrado com sucesso.`)
                fs.writeFileSync(FLAG_FILE, 'registered')//cria a flag
                res.redirect('/login')
        })
    })

})


//login

router.get('/login', (req,res)=>{
    res.render('login.handlebars')
})

//registered

router.post('/registered',(req,res)=>{
    const {user, password} = req.body

    userDb.get(`SELECT *FROM users WHERE user = ?`, [user], (err, userFound)=>{
        if(err){
            console.error('Erro no banco de dados:', err.message);
            return res.status(500).send('Erro interno do servidor.');
        }

        if(!userFound){
            console.log('Credenciais invalidas.')
            return res.redirect('/login?error=invalid')
        }

        bcrypt.compare(password, userFound.password, (err, result)=>{
            if(result){
                req.session.user = userFound //Salva o usuario na sessão
                res.redirect('/home')
            }else{
                console.log('senha incorreta')
                res.redirect('/login?error=invalid')
            }
        })

    })

})


//para logar e apos logar
router.get('/home', isAuthenticated, (req,res)=>{
    
    res.render('home.handlebars')
})
//logout
router.get('/logout', (req,res)=>{
    req.session.destroy(err => {
        if(err){
            console.error('Error to detroy the session: ', err)
            return res.status(500).send('Internal server Error')
        }
        res.redirect('/')
    })
})


module.exports = router