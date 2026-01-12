/**************************************************************************
 * Objetivo: DAO responsável pela autenticação e códigos temporários
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require("../../config/supabase.js");

/**
 * GERAR CÓDIGO TEMPORÁRIO (6 dígitos)
 */
const gerarCodigoTemp = function () {
  const codigo = Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
  return codigo;
};

/**
 * INSERIR OU ATUALIZAR CÓDIGO TEMPORÁRIO
 */
const armazenarCodigo = async function (
  telefone,
  codigo,
  is_segundaValidacao = false
) {
  try {
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + 5); // Código expira em 5 minutos

    // Verificar se já existe um código para este telefone
    const { data: codigoExistente } = await supabase
      .from("codigo_temp")
      .select("*")
      .eq("telefone", telefone)
      .single();

    if (codigoExistente) {
      // Atualizar código existente
      const { data, error } = await supabase
        .from("codigo_temp")
        .update({
          codigo: codigo,
          expira_em: expiraEm.toISOString(),
          is_segundaValidacao: is_segundaValidacao,
        })
        .eq("telefone", telefone)
        .select();

      if (error) throw error;
      return data[0];
    } else {
      // Inserir novo código
      const { data, error } = await supabase
        .from("codigo_temp")
        .insert([
          {
            telefone: telefone,
            codigo: codigo,
            expira_em: expiraEm.toISOString(),
            is_segundaValidacao: is_segundaValidacao,
          },
        ])
        .select();

      if (error) throw error;
      return data[0];
    }
  } catch (error) {
    console.error("Erro ao armazenar código:", error);
    return false;
  }
};

/**
 * VALIDAR CÓDIGO TEMPORÁRIO
 * NOTA: O código pode ser usado múltiplas vezes até expirar
 */
const validarCodigoTemp = async function (telefone, codigo) {
  try {
    console.log("🔍 [VALIDAR CÓDIGO] Parâmetros recebidos:", {
      telefone,
      codigo,
      tipoCodigo: typeof codigo,
      tipoTelefone: typeof telefone,
    });

    const { data, error } = await supabase
      .from("codigo_temp")
      .select("*")
      .eq("telefone", telefone)
      .eq("codigo", codigo)
      .single();

    console.log("📊 [VALIDAR CÓDIGO] Resultado da query:", {
      encontrou: !!data,
      erro: error?.message || null,
      codigoNoBanco: data?.codigo,
      telefonNoBanco: data?.telefone,
      expiraEm: data?.expira_em,
    });

    if (error || !data) {
      console.log("❌ [VALIDAR CÓDIGO] Código não encontrado no banco");
      return false;
    }

    // Verificar se o código expirou
    const agora = new Date();
    const expiraEm = new Date(data.expira_em);

    console.log("⏰ [VALIDAR CÓDIGO] Verificação de expiração:", {
      agora: agora.toISOString(),
      expiraEm: expiraEm.toISOString(),
      expirou: agora > expiraEm,
      diferençaMinutos: Math.floor((expiraEm - agora) / 1000 / 60),
    });

    if (agora > expiraEm) {
      console.log("❌ [VALIDAR CÓDIGO] Código expirado");
      return false;
    }

    console.log("✅ [VALIDAR CÓDIGO] Código válido! Pode ser usado novamente.");
    return data;
  } catch (error) {
    console.error("❌ [VALIDAR CÓDIGO] Erro ao validar código:", error);
    return false;
  }
};

/**
 * DELETAR CÓDIGO APÓS VALIDAÇÃO
 */
const deletarCodigo = async function (telefone) {
  try {
    const { error } = await supabase
      .from("codigo_temp")
      .delete()
      .eq("telefone", telefone);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao deletar código:", error);
    return false;
  }
};

/**
 * BUSCAR CÓDIGO POR TELEFONE
 */
const selectByTelefoneCodigo = async function (telefone) {
  try {
    const { data, error } = await supabase
      .from("codigo_temp")
      .select("*")
      .eq("telefone", telefone)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar código por telefone:", error);
    return false;
  }
};

module.exports = {
  gerarCodigoTemp,
  armazenarCodigo,
  validarCodigoTemp,
  deletarCodigo,
  selectByTelefoneCodigo,
};
