/**************************************************************************
 * Objetivo: Configuração do cliente Supabase
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 2.0 - Otimizado para baixa latência
 **************************************************************************/

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const https = require("https");

// Configuração Supabase (valores fixos para produção)
const supabaseUrl =
  process.env.SUPABASE_URL || "https://xkwjhigcraahhmcjjzff.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrd2poaWdjcmFhaGhtY2pqemZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjgyODcsImV4cCI6MjA3NTY0NDI4N30.gwEqCWCwTGF1fIhN5ctBrpK8WwxGlB4eaa7CAbcc6lA";

// 🚀 HTTP Keep-Alive Agent - Reutiliza conexões TCP/TLS
// Reduz latência em ~200-300ms por evitar handshakes repetidos
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000, // Manter conexão por 60s
  maxSockets: 50,         // Máximo de sockets simultâneos
  maxFreeSockets: 10,     // Manter 10 sockets livres em pool
  timeout: 30000,         // Timeout de 30s
});

// Criar cliente do Supabase com configurações otimizadas para Lambda
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false, // Desabilitar refresh automático em Lambda
    persistSession: false,   // Não persistir sessão em Lambda
    detectSessionInUrl: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "X-Client-Info": "supabase-js-lambda",
    },
    // Injetar o agent com Keep-Alive no fetch do Supabase
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        agent: httpsAgent,
      });
    },
  },
});

module.exports = supabase;
