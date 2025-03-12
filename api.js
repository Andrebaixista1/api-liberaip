const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

connection.connect(err => {
  if (err) {
    console.error('Erro ao conectar no MySQL:', err);
    process.exit(1);
  }
  console.log('Conectado ao MySQL!');
});

// Inclua o IP local (127.0.0.1) ou "::1" se estiver testando localmente
const allowedIps = ['201.0.21.143', '45.224.161.116', '127.0.0.1', '::1'];

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
  let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  clientIp = clientIp.replace(/^::ffff:/, '');

  if (!allowedIps.includes(clientIp)) {
    return res.status(403).json({ error: 'IP não autorizado' });
  }

  const { ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado } = req.body;
  const sql = `
    INSERT INTO ip_data (ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  connection.query(sql, [ip, descricao, data_vencimento, limite_consultas, data_adicao, total_carregado], (err, result) => {
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
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
