// index.js

const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
//var morgan = require('morgan')

require('dotenv').config();

const app = express();
//app.use(morgan("combined"));

app.use(bodyParser.json());
const port = process.env.PORT || 9999;

// Configurações do banco de dados
const pool = new Pool({
  user: process.env.USERDB || 'admin',
  host: process.env.HOSTDB || 'localhost',
  database: process.env.DB || 'rinha',
  password: process.env.PASSWORDDB || '123',
  port: 5432, // Porta padrão do PostgreSQL
  max:process.env.MAX || 20,

});





// Rota para buscar dados do banco
app.get('/clientes/:id/extrato', async (req, res) => {

  const clientConnect = await pool.connect();

  try {
    const client = await clientConnect.query(`SELECT c.limite, s.valor, t.*
    FROM clientes c
    left join saldos s on s.cliente_id = c.id 
    LEFT JOIN transacoes t ON s.cliente_id = t.cliente_id
    WHERE s.cliente_id = $1
    ORDER BY t.realizada_em DESC
    LIMIT 10
`, [req.params.id]);
    if (client.rowCount === 0) return res.status(404).json();

    const transacoes = client.rows.map(item => ({
      valor: item.valor,
      tipo: item.tipo,
      descricao: item.descricao,
      realizada_em: item.realizada_em
    }))
    const result = {
      saldo: {
        data_extrato: new Date(),
        limite: client.rows[0].limite,
        total: client.rows[0].valor
      },
      ultimas_transacoes: [...transacoes]

    }

    return res.status(200).json(result);
  } catch (error) {
    //console.error('Erro ao buscar dados:', error);
    res.status(500).json();
  }
  finally{
    clientConnect.release();
  }
});

const validateRequest = (req) => {
  try {
    const valor = req.body.valor * 1;
    const descricao = req.body.descricao;
    const tipo = req.body.tipo;
    if (
      !Number.isInteger(valor) ||
      valor === undefined ||
      valor < 0 ||
      descricao === undefined ||
      descricao === null ||
      descricao.length > 10 ||
      descricao.length < 1) return false;
    if (tipo !== "d" && tipo !== "c") return false;
  }
  catch (e) { return false; }
  return true;

}

app.post('/clientes/:id/transacoes', async (req, res) => {
  if (!validateRequest(req)) {
    return res.status(422).json();
  }
  const clientConnect = await pool.connect();
  try {
    await clientConnect.query('BEGIN');
    const client = await clientConnect.query(`select c.limite, b.valor from clientes c inner join saldos b on c.id = b.cliente_id where c.id=$1 for update`, [req.params.id]);
    if (client.rowCount === 0) {
      await clientConnect.query('ROLLBACK').json();
      return res.status(404);
    }
    if (req.body.tipo === "d"
      && client.rows[0].valor + client.rows[0].limite < (req.body.valor * 1)) {
      await clientConnect.query('ROLLBACK');
      return res.status(422).json();
    }

    const valor = req.body.tipo === "d" ? req.body.valor * -1 : req.body.valor * 1;
    const novoSaldo = await clientConnect.query('UPDATE saldos SET valor = valor + $2 where cliente_id = $1 RETURNING valor', [req.params.id, valor])
    await clientConnect.query('INSERT INTO transacoes(cliente_id, valor, tipo, descricao) values ($1, $2, $3, $4)',
      [req.params.id, req.body.valor * 1, req.body.tipo, req.body.descricao]);
    await clientConnect.query('COMMIT');
    return res.status(200).json({ limite: client.rows[0].limite, saldo: novoSaldo.rows[0].valor })
  } catch (error) {
    await clientConnect.query('ROLLBACK');
    //console.error('Erro ao buscar dados:', error);
    return res.status(500).json();
  }
  finally {
     clientConnect.release();
  }

})

var attempts = 0;


async function fetchData(attempts = 0) {
  try {
    await pool.query("select 1");
    console.log("Conexão com o banco de dados estabelecida com sucesso");
  } catch (error) {
    console.log("Erro ao conectar com o banco de dados", new Date());
    if (attempts < 15) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(fetchData(attempts + 1)), 2000);
      });
    } else {
      console.log('Falha ao buscar dados após 5 tentativas');
    }
  }
}


fetchData().then(() => {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
});
