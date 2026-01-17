/**************************************************************************
 * Objetivo: Configuração do cliente Supabase
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 3.0 - Otimizado para Vercel (Singleton Pattern)
 **************************************************************************/

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Configuração Supabase
const supabaseUrl =
  process.env.SUPABASE_URL || "https://xkwjhigcraahhmcjjzff.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrd2poaWdjcmFhaGhtY2pqemZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjgyODcsImV4cCI6MjA3NTY0NDI4N30.gwEqCWCwTGF1fIhN5ctBrpK8WwxGlB4eaa7CAbcc6lA";

// 🚀 Singleton Pattern - Reutiliza mesma instância em invocações warm
let supabaseInstance = null;

const getSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "X-Client-Info": "supabase-js-vercel",
        Connection: "keep-alive", // HTTP keep-alive
      },
    },
    // Configurações de performance para Vercel
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });

  return supabaseInstance;
};

module.exports = getSupabaseClient();
