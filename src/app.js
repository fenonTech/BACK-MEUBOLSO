/**************************************************************************
 * Objetivo: API REST para gerenciamento financeiro MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 * 
 * Bibliotecas necessárias:
 *      express                 npm install express --save
 *      cors                    npm install cors --save
 *      body-parser             npm install body-parser --save
 *      @supabase/supabase-js   npm install @supabase/supabase-js --save
 *      dotenv                  npm install dotenv --save
 **************************************************************************/

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Testar conexão com Supabase
const supabase = require('./config/supabase.js');
console.log('Conexão com Supabase configurada com sucesso.');

// Importar rotas
const routes = require('./route/routes.js');

// Rota de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API MeuBolso is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bem-vindo à API MeuBolso',
    version: '1.0'
  });
});

// Prefixo base da API
app.use('/api', routes);

module.exports = app;
