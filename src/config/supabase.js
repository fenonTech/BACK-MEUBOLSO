/**************************************************************************
 * Objetivo: Configuração do cliente Supabase
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Configuração Supabase (valores fixos para produção)
const supabaseUrl =
  process.env.SUPABASE_URL || "https://xkwjhigcraahhmcjjzff.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrd2poaWdjcmFhaGhtY2pqemZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjgyODcsImV4cCI6MjA3NTY0NDI4N30.gwEqCWCwTGF1fIhN5ctBrpK8WwxGlB4eaa7CAbcc6lA";

// Criar cliente do Supabase com configurações otimizadas para Lambda
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false, // Desabilitar refresh automático em Lambda
    persistSession: false, // Não persistir sessão em Lambda
    detectSessionInUrl: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "X-Client-Info": "supabase-js-lambda",
    },
  },
});

module.exports = supabase;
