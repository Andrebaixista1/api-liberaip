// index.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://libera-ip.vercel.app',
      'https://api-liberaip.vercel.app',
      'http://localhost:20251',
      'https://consulta-in100-vi.vercel.app/'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apiKey', 'x-client-ip']
  })
);

app.use(express.json());
// app.options('/api/query', cors());

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

connection.connect(err => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err);
    process.exit(1);
  }
  console.log('Conectado ao MySQL!');
});

app.get('/api/ipdata', (req, res) => {
  connection.query('SELECT * FROM ip_data', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

app.post('/api/ipdata', (req, res) => {
  const { ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado } = req.body;
  const sql = `
    INSERT INTO ip_data (ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  connection.query(
    sql,
    [ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }
      const insertedId = result.insertId;
      connection.query('SELECT * FROM ip_data WHERE id = ?', [insertedId], (err2, results2) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: err2.message });
        }
        res.json(results2[0]);
      });
    }
  );
});

// Rota para atualizar o IP (e outras colunas se desejar) de um registro pelo ID
app.put('/api/ipdata/:id', (req, res) => {
  const { id } = req.params;
  const { ip } = req.body;
  const sql = 'UPDATE ip_data SET ip = ? WHERE id = ?';
  connection.query(sql, [ip, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }
    connection.query('SELECT * FROM ip_data WHERE id = ?', [id], (err2, results2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json({ error: err2.message });
      }
      res.json(results2[0]);
    });
  });
});


// Rota CORRETA e segura para alterar IP por ID
app.post('/api/update-ip', (req, res) => {
  const { id, ip } = req.body;

  if (!id || !ip) {
    return res.status(400).json({ error: 'Campos "id" e "ip" são obrigatórios.' });
  }

  const sql = 'UPDATE ip_data SET ip = ? WHERE id = ?';

  connection.query(sql, [ip, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    res.json({ success: true, message: 'IP atualizado com sucesso!' });
  });
});



app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}
