/**************************************************************************
 * Objetivo: Configuração do cliente Supabase
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validar variáveis de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados no .env');
}

// Criar cliente do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

module.exports = supabase;
