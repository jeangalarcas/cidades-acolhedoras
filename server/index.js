require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/municipio',  require('./routes/municipio'));
app.use('/api/ana', require('./routes/ana'));
app.use('/api/cemaden',    require('./routes/cemaden'));
app.use('/api/canoas',     require('./routes/canoas'));
app.use('/api/municipios', require('./routes/municipios'));
app.use('/api/registro',   require('./routes/registro'));
app.use('/api/inmet',      require('./routes/inmet'));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', ts: new Date(), version: 'SGA v3', municipios: 497 })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SGA API rodando na porta ${PORT}`));

