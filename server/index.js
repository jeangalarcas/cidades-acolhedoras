require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/municipios', require('./routes/municipios'));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', ts: new Date(), version: 'SGA v3' })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SGA API rodando na porta ${PORT}`));