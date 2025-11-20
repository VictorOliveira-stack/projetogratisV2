const express = require('express')
const router = express.Router()

const dbProd = require("../model/tableproducts.js")

// Middleware para processar dados em JSON
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const isAuthenticated = (req, res, next)=>{
    if(req.session.user){
        //verifica se há um usuario na sessão
        return next()
    }
    res.redirect('/login') //Se não houver, iria direcionar para a pagina de login
}

//aqui é importante
//aqui é onde exibe todas as tabelas juntas 
router.get('/alltables', isAuthenticated, (req, res) => {
    // Pega as mensagens de sucesso/erro da URL
    const successMessage = req.query.success === 'true' ? 'Tabela criada com sucesso!' : null;
    const errorMessage = req.query.error ? 'Erro: ' + req.query.error : null;

    
    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY ROWID DESC", (err, tables) => {
        if (err) {
            console.error('Erro ao buscar as tabelas:', err.message);
            return res.status(500).send('Erro interno do servidor.');
        }

        if (tables.length > 0) {
            const tableToRender = tables[0].name;

            dbProd.all(`SELECT * FROM "${tableToRender}" ORDER BY id DESC`, (err, rows) => {
                if (err) {
                    console.error(`Erro ao buscar dados da tabela '${tableToRender}':`, err.message);
                    return res.render('createtable.handlebars', {
                        tables: tables,
                        successMessage: successMessage,
                        errorMessage: `Erro ao carregar dados da tabela '${tableToRender}'.`,
                        tablesname: tableToRender
                    });
                }

                return res.render('alltables.handlebars', {
                    tables: tables,
                    data: rows,
                    selectedTable: tableToRender,
                    successMessage: successMessage,
                    errorMessage: errorMessage,
                    tablesname: tableToRender
                });
            });
        } else {
            // Este é o bloco que estava faltando o 'tablesname'
            res.render('alltables.handlebars', {
                tables: [],
                successMessage: successMessage,
                errorMessage: errorMessage,
                tablesname: '' // Agora, mesmo se não houver tabelas, o valor é passado
            });
        }
    });
});
//aqui é importante
//aqui é onde exibe todas as tabelas juntas 




    //crud nome tables
//create table/reder tables in home
router.get('/createtable', isAuthenticated, (req, res) => {
    // Pega as mensagens de sucesso/erro da URL
    const successMessage = req.query.success === 'true' ? 'Tabela criada com sucesso!' : null;
    const errorMessage = req.query.error ? 'Erro: ' + req.query.error : null;

    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'produto%' ORDER BY ROWID DESC", (err, tables) => {
        if (err) {
            console.error('Erro ao buscar as tabelas:', err.message);
            return res.status(500).send('Erro interno do servidor.');
        }

        if (tables.length > 0) {
            const tableToRender = tables[0].name;

            dbProd.all(`SELECT * FROM "${tableToRender}" ORDER BY id DESC`, (err, rows) => {
                if (err) {
                    console.error(`Erro ao buscar dados da tabela '${tableToRender}':`, err.message);
                    return res.render('createtable.handlebars', {
                        tables: tables,
                        successMessage: successMessage,
                        errorMessage: `Erro ao carregar dados da tabela '${tableToRender}'.`,
                        tablesname: tableToRender
                    });
                }

                return res.rend('createtable.handlebars', {
                    tables: tables,
                    data: rows,
                    selectedTable: tableToRender,
                    successMessage: successMessage,
                    errorMessage: errorMessage,
                    tablesname: tableToRender
                });
            });
        } else {
            // Este é o bloco que estava faltando o 'tablesname'
            res.render('createtable.handlebars', {
                tables: [],
                successMessage: successMessage,
                errorMessage: errorMessage,
                tablesname: '' // Agora, mesmo se não houver tabelas, o valor é passado
            });
        }
    });
});



//criar a tabela por req nome
router.post('/creatingtable', isAuthenticated, (req, res) => {
    const { tablesname } = req.body;

    
    const sanitizedTablesName = tablesname.trim(); // Remove espaços em branco
    const regex = /^[a-zA-Z0-9_-çÇ .,!?]+$/; // Permite letras, números e underscores e çÇ e espaço graças a um espaço passado aqui /^[a-zA-Z0-9_-çÇ ]+$/

    if (!sanitizedTablesName || sanitizedTablesName.length > 50 || !regex.test(sanitizedTablesName)) {
        return res.redirect('/createtable?error=invalid_name');
    }


    //adicionei
        //ativa a foreign key
    dbProd.all("PRAGMA foreign_keys = ON;", (err) => {
        if (err) {
            console.error("Erro ao ativar Foreign Keys:", err.message);
        } else {
            console.log("Suporte a Foreign Keys ativado.");
        }
    });


    
    dbProd.run(`CREATE TABLE IF NOT EXISTS "${sanitizedTablesName}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT,
        valor DECIMAL(10,2),
        quantidade_comprada INT,
        descricao TEXT,
        estoque INT,
        quantidade_vendida INT DEFAULT 0,
        valor_venda,
        ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error(`Erro ao criar a tabela '${sanitizedTablesName}': `, err.message);
            return res.redirect(`/createtable?error=${encodeURIComponent(err.message)}`);
        }
        
        console.log(`Tabela '${sanitizedTablesName}' criada ou já existe.`);
        res.redirect('/createtable?success=true');
    });
    
});

/*router.post('/creatingtable', isAuthenticated, (req, res) => {
    const { tablesname } = req.body;

    
    const sanitizedTablesName = tablesname.trim(); // Remove espaços em branco
    // Regex de validação do nome da tabela
    const regex = /^[a-zA-Z0-9_-çÇ .,!?]+$/; 

    if (!sanitizedTablesName || sanitizedTablesName.length > 50 || !regex.test(sanitizedTablesName)) {
        return res.redirect('/createtable?error=invalid_name');
    }

    // --- Definições do Trigger (Gatilho) ---
    const triggerNameBase = sanitizedTablesName.replace(/[^a-zA-Z0-9_]/g, ''); 

    // 1. Gatilho AFTER UPDATE: Recalcula o estoque quando a quantidade_vendida muda.
    const createUpdateTriggerSQL = `
        CREATE TRIGGER IF NOT EXISTS update_estoque_venda_${triggerNameBase}
        AFTER UPDATE OF quantidade_vendida ON "${sanitizedTablesName}"
        FOR EACH ROW
        WHEN NEW.quantidade_vendida <> OLD.quantidade_vendida
        BEGIN
            -- Subtrai do estoque a diferença entre a nova venda (NEW) e a venda anterior (OLD)
            UPDATE "${sanitizedTablesName}"
            SET estoque = estoque - (NEW.quantidade_vendida - OLD.quantidade_vendida),
                ultima_atualizacao = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
        END;
    `;

    // REMOVIDO: O Trigger AFTER INSERT, pois estava sendo problemático.
    // O cálculo inicial é feito na rota /inserttableprod.


    // Usamos serialize para garantir a ordem correta dos comandos.
    dbProd.serialize(() => {
        let errorEncountered = false;

        // 1. Ativa a Foreign Key
        dbProd.run("PRAGMA foreign_keys = ON;", (err) => {
            if (err) { console.error("Erro ao ativar Foreign Keys:", err.message); }
        });

        // 2. Cria a Tabela
        dbProd.run(`CREATE TABLE IF NOT EXISTS "${sanitizedTablesName}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT,
            valor DECIMAL(10,2),
            quantidade_comprada INT,
            descricao TEXT,
            estoque INT,
            quantidade_vendida INT DEFAULT 0,
            valor_venda,
            ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error(`Erro ao criar a tabela '${sanitizedTablesName}': `, err.message);
                errorEncountered = true;
                return res.redirect(`/createtable?error=${encodeURIComponent(err.message)}`);
            }

            // 3. Cria o Gatilho AFTER UPDATE (ÚNICO Gatilho restante)
            dbProd.run(createUpdateTriggerSQL, (err) => {
                if (err) { 
                    console.error(`Erro ao criar o Gatilho UPDATE para '${sanitizedTablesName}': `, err.message);
                    errorEncountered = true;
                    return res.redirect(`/createtable?error=${encodeURIComponent('Erro ao criar o gatilho UPDATE: ' + err.message)}`); 
                }

                
                if (!errorEncountered) {
                    console.log(`Tabela criada e Gatilho AFTER UPDATE para '${sanitizedTablesName}' instalado.`);
                    return res.redirect('/createtable?success=true');
                }
            });
        });
    });
});*/

//deletar a table
router.post("/droptableprod", isAuthenticated, (req,res)=>{
    const tablesname = req.body.tablesname
    //const id = req.body.id

    if (!tablesname) {
        return res.status(400).send('Missing table name or ID.');
    }

    dbProd.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [tablesname], (err, table)=> {

        if (err || !table){
            console.warn(`Attempt to delete from an invalid or non-existent table: ${tablesname}`);
            return res.status(404).send('Page not found.');
        }

        const sql = `DROP TABLE "${tablesname}"`

        dbProd.run(sql, function (err){
            if (err) {
                console.error(`Error dropping table '${tablesname}': `, err.message);
                return res.status(500).send('Error dropping table.');
            }

            console.log(`Table '${tablesname}' was successfully dropped.`);
            // 4. Redireciona o usuário para uma página de sucesso, talvez a lista de tabelas
            
            res.redirect('/alltables')
        })

    } )

});

    //edit name table
router.get('/altertableprod', isAuthenticated, (req, res)=>{
    const tablesname = req.query.tablesname

    /*const isValid = /^[a-zA-Z0-9_]+$/
    if(!tablesname|| isValid){
        return res.status(400).send('nome da tabela invalido ou ausente')
    }*/

    dbProd.get("SELECT name FROM sqlite_master WHERE type='table' AND name= ?", [tablesname], (err, table)=>{
        if(err){
            console.log('erro ao verificar tabela:', err.message)
            return res.status(500).send('Tabela não encontradad')
        }

        if (!table) {
            return res.status(404).send('Tabela não encontrada.');
        }

        res.render('altertableprod.handlebars', {tablesname: tablesname})
    })

})

//alterar nome da table
router.post('/altertableprod', isAuthenticated, (req, res)=>{
    console.log(req.body)
    const tablesname = req.body.tablesname
    const newNameTable = req.body.newNameTable

    if(!tablesname){
        return res.status(400).send('Old and new table names are required.');
    }

    dbProd.get("SELECT name FROM sqlite_master WHERE type='table' AND name= ? ", [tablesname], (err, table) => {
        if (err || !table) {
            console.warn(`Attempted to rename an invalid or non-existent table: ${tablesname}`);
            return res.status(404).send('Table not found.');
        }

        const sql = `ALTER TABLE "${tablesname}" RENAME TO "${newNameTable}"`

        dbProd.run(sql, (err)=>{
            if(err){
                console.error(`Error renaming table '${tablesname}': `, err.message);
                return res.status(500).send('Error renaming table.');
            }

            console.log(`Table '${tablesname}' was successfully renamed to '${newNameTable}'.`);
                // 5. Redirecione o usuário para a lista de tabelas para ver a mudança
                res.redirect('/alltables'); 
        })


    })
})   

     //crud nome tables



    //
//rota para fazer redirecionar e renderizar de acordo com o id da table em showtable.handlebars
router.get('/showtable/:tablesname', isAuthenticated, (req,res)=>{
    const tablesname = req.params.tablesname

    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ", (err, tables)=>{

        if(err){
            console.error('Erro to get tables lists', err.message)
            return res.status(500).send('internal Error on server')
        }

        const validTables = tables.map(table => table.name)

        if(!validTables.includes(tablesname)){
            console.warn(`tentativa de acesso a uma tabela invalida: ${tablesname}`)
            return res.status(404).send('Pagina não encontrada')
        }

        dbProd.all(`SELECT *FROM "${tablesname}" ORDER BY id DESC`, (err, rows)=>{
        
        if (err) {
            console.error(`Erro ao buscar dados da tabela '${tablesname}': `, err.message);
            return res.status(500).send('Erro ao buscar dados da tabela.');
        }

            const sqlSum = `SELECT SUM(valor) AS valorTotal, SUM(quantidade_comprada) AS quantidadeTotal FROM "${tablesname}"`

            dbProd.get(sqlSum, (err, sums) =>{
                if(err){
                    console.error(`Error ao calcular totais para a tabela '${tablesname}'`)
                    return res.status(500).send('Error ao criar totais.')
                }
                res.render('showtable.handlebars', {
                    tablesname: tablesname,
                    data: rows,
                    valorTotal: sums.valorTotal,
                    quantidadeTotal: sums.quantidadeTotal
                })

            })

        
        })

    })

    
    
})


//inicio do crud em tableproducts

// inserttableprod

/*router.post('/inserttableprod', isAuthenticated, (req, res) => {
   
    const tablesname = req.body.tablesname; // Você precisará adicionar um input hidden com o nome da tabela

    const produto = req.body.produto;
    const valor = req.body.valor;
    const quantidade_comprada = req.body.quantidade_comprada;
    const descricao = req.body.descricao;
    const estoque = req.body.estoque;
    const quantidade_vendida = req.body.quantidade_vendida;
    const valor_venda = req.body.valor_venda

    // validação da whitelist //importante! estudar mais sobre isso
    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ", (err, tables) => {
        if (err) {
            return res.status(500).send('Erro interno do servidor');
        }

        const validTables = tables.map(table => table.name);

        if (!validTables.includes(tablesname)) {
            console.warn(`Tentativa de inserção em uma tabela inválida: ${tablesname}`);
            return res.status(404).send('Página não encontrada');
        }

        
        const sql = `INSERT INTO "${tablesname}" (produto, valor, quantidade_comprada, descricao, estoque, quantidade_vendida, valor_venda) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [produto, valor, quantidade_comprada, descricao, estoque, quantidade_vendida, valor_venda];

        
        dbProd.run(sql, values, (err) => {
            if (err) {
                console.error(`Erro ao inserir dados na tabela '${tablesname}': `, err.message);
                return res.status(500).send('Erro ao inserir dados.');
            }
            res.redirect(`/alltables`); // Redireciona de volta para a tabela
        });
    });

    

});*/

router.post('/inserttableprod', isAuthenticated, (req, res) => {
    
    const tablesname = req.body.tablesname; 

    const produto = req.body.produto;
    const valor = req.body.valor;
    const quantidade_comprada = req.body.quantidade_comprada;
    const descricao = req.body.descricao;
    // const estoque = req.body.estoque; <-- Ignoramos o valor do formulário
    const quantidade_vendida = req.body.quantidade_vendida;
    const valor_venda = req.body.valor_venda

    // Cálculo do Estoque de FORMA CONFIÁVEL no Node.js para o INSERT inicial
    const quantidadeComprada = Number(quantidade_comprada) || 0;
    const quantidadeVendida = Number(quantidade_vendida) || 0;
    const estoqueCalculado = quantidadeComprada - quantidadeVendida;

    // validação da whitelist
    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ", (err, tables) => {
        if (err) {
            return res.status(500).send('Erro interno do servidor');
        }

        const validTables = tables.map(table => table.name);

        if (!validTables.includes(tablesname)) {
            console.warn(`Tentativa de inserção em uma tabela inválida: ${tablesname}`);
            return res.status(404).send('Página não encontrada');
        }

        // A query SQL usa o estoqueCalculado
        const sql = `INSERT INTO "${tablesname}" (produto, valor, quantidade_comprada, descricao, estoque, quantidade_vendida, valor_venda) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const values = [produto, valor, quantidade_comprada, descricao, estoqueCalculado, quantidade_vendida, valor_venda];

        
        dbProd.run(sql, values, (err) => {
            if (err) {
                console.error(`Erro ao inserir dados na tabela '${tablesname}': `, err.message);
                return res.status(500).send('Erro ao inserir dados.');
            }
            res.redirect(`/alltables`); // Redireciona de volta para a tabela
        });
    });
});




//DELET


router.post('/delettableprod', isAuthenticated, (req, res) => {

    console.log('Dados recebidos no corpo da requisição:', req.body);

    const tablesname = req.body.tablesname
    const id = req.body.id;

    if (!tablesname) {
        return res.status(400).send('Nome da tabela não fornecido.');
    }
    if (!id) {
        return res.status(400).send('ID do item não fornecido.');
    }

    
    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
        if (err) {
            return res.status(500).send('Erro interno do servidor');
        }

        const validTables = tables.map(table => table.name);
        // A LISTA DE TABELAS VÁLIDAS DO MEU BANCO
        console.log('Tabelas válidas no banco de dados:', validTables);

        if (!validTables.includes(tablesname)) {
            // CORRIGIDO: A mensagem agora fala de deleção, não inserção
            console.warn(`Tentativa de deleção em uma tabela inválida: ${tablesname}`);
            return res.status(404).send('Página não encontrada');
        }

        const sql = `DELETE FROM "${tablesname}" WHERE id = ?`;
        const values = [id];

        dbProd.run(sql, values, (err) => {
            if (err) {
                console.error(`Erro ao deletar dados na tabela '${tablesname}': `, err.message);
                return res.status(500).send('Erro ao deletar dados.');
            }
            res.redirect(`/showtable/${tablesname}`);
        });
    });
});

router.get('/edittableprod/:tablesname/:id', isAuthenticated, (req, res)=>{

    console.log(req.body)


    const tablesname = req.params.tablesname
    

    const id = req.params.id

    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ", (err, tables)=>{

        if(err){
            console.error('Erro to get tables lists', err.message)
            return res.status(500).send('internal Error on server')
        }

        const validTables = tables.map(table => table.name)

        if(!validTables.includes(tablesname)){
            console.warn(`tentativa de acesso a uma tabela invalida: ${tablesname}`)
            return res.status(404).send('Pagina não encontrada')
        }

        dbProd.all(`SELECT *FROM "${tablesname}" WHERE id = ?`, [id], (err, rows)=>{
        
        if (err) {
            console.error(`Erro ao buscar dados da tabela '${tablesname}': `, err.message);
            return res.status(500).send('Erro ao buscar dados da tabela.');
        }
         // Check if any rows were returned
         if (rows.length === 0) {
            return res.status(404).send('No data found for the given ID.');
        }
        res.render('edittableprod.handlebars', {
            tablesname: tablesname,
            id: id,
            data: rows[0] //passa apenas o primeiro item do array//se achar que deve tirar depois 0 [0]
            })
        })

    })

    //res.render('edittableprod.handlebars')
})


/*router.post('/updatetablesprod', isAuthenticated, (req, res)=>{

    console.log(req.body)


    const tablesname = req.body.tablesname

    const id = req.body.id
    const produto = req.body.produto;
    const valor = req.body.valor;
    const quantidade_comprada = req.body.quantidade_comprada;
    const descricao = req.body.descricao;
    const estoque = req.body.estoque;
    const quantidade_vendida = req.body.quantidade_vendida;
    const valor_venda = req.body.valor_venda


    if (!tablesname || !id || !produto || !valor || !quantidade_comprada || !descricao || !estoque || !quantidade_vendida || !valor_venda) {
        return res.status(400).send('Missing required data.');
    }

    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ", (err, tables)=>{

        if(err){
            console.error('Erro to get tables lists', err.message)
            return res.status(500).send('internal Error on server')
        }

        const validTables = tables.map(table => table.name)

        if(!validTables.includes(tablesname)){
            console.warn(`tentativa de acesso a uma tabela invalida: ${tablesname}`)
            return res.status(404).send('Pagina não encontrada')
        }

        //adotar de vez essa estrutura mais simplificada de declarar as querys que em outros projetos estavas usando
        const sql = `UPDATE  "${tablesname}" SET produto = ?, valor = ?, quantidade_comprada = ?, descricao = ?, estoque = ?, quantidade_vendida = ?, valor_venda = ?  WHERE id = ?`
        const params = [produto, valor, quantidade_comprada, descricao, estoque, quantidade_vendida, valor_venda,   id]

        //adotar de vez essa estrutura mais simplificada de rodar as querys que em outros projetos estavas usando
        dbProd.run( sql, params, function(err, rows){
        
            if (err) {
                console.error(`Erro ao buscar dados da tabela '${tablesname}': `, err.message);
                return res.status(500).send('Erro ao buscar dados da tabela.');
            }
         // Check if any rows were returned
         /*if (rows.length === 0) {
            return res.status(404).send('No data found for the given ID.');
        }*/
            //res.redirect(`/showtable/${tablesname}`)//retire essa barra
        //res.redirect(`/showtablesprod/${tablesname}`);
        //})//retire essa barra

    //})//retire essa barra

    //res.render('edittableprod.handlebars')
//})*/

router.post('/updatetablesprod', isAuthenticated, (req, res) => {
    const tablesname = req.body.tablesname;
    const id = req.body.id;
    const produto = req.body.produto;
    const valor = req.body.valor;
    const quantidade_comprada = Number(req.body.quantidade_comprada);
    const descricao = req.body.descricao;
    const quantidade_vendida = Number(req.body.quantidade_vendida);
    const valor_venda = req.body.valor_venda;

    if (!tablesname || !id) {
        return res.status(400).send('Dados insuficientes.');
    }

    dbProd.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, tables) => {
        if (err) {
            console.error('Erro ao listar tabelas', err.message);
            return res.status(500).send('Erro interno do servidor');
        }

        const validTables = tables.map(table => table.name);
        if (!validTables.includes(tablesname)) {
            console.warn(`Tentativa de acesso a tabela inválida: ${tablesname}`);
            return res.status(404).send('Tabela não encontrada');
        }

        // 🔹 Recalcular o estoque de forma confiável
        const estoqueCalculado = quantidade_comprada - quantidade_vendida;

        const sql = `
            UPDATE "${tablesname}" 
            SET produto = ?, valor = ?, quantidade_comprada = ?, descricao = ?, quantidade_vendida = ?, valor_venda = ?, estoque = ?, ultima_atualizacao = CURRENT_TIMESTAMP
            WHERE id = ?`;

        const params = [
            produto, 
            valor, 
            quantidade_comprada, 
            descricao, 
            quantidade_vendida, 
            valor_venda,
            estoqueCalculado,
            id
        ];

        dbProd.run(sql, params, function (err) {
            if (err) {
                console.error(`Erro ao atualizar dados da tabela '${tablesname}': `, err.message);
                return res.status(500).send('Erro ao atualizar dados da tabela.');
            }
            res.redirect(`/showtable/${tablesname}`);
        });
    });
});

module.exports = router