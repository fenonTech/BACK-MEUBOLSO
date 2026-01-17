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

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// Configurações de CORS otimizadas
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
    maxAge: 86400, // Cache preflight por 24h
  })
);

// Parser JSON com limite
app.use(express.json({ limit: "1mb" }));

// Lazy load - não importar supabase aqui (cold start mais rápido)
// Importar rotas
const routes = require("./route/routes.js");

// Rota de health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API MeuBolso is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rota raiz
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Bem-vindo à API MeuBolso",
    version: "1.0",
  });
});

// Prefixo base da API
app.use("/api", routes);

module.exports = app;
