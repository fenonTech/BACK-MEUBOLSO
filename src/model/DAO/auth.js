/**************************************************************************
 * Objetivo: DAO responsável pela autenticação e códigos temporários
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require("../../config/supabase.js");

/**
 * HELPER: Obter data/hora atual no horário de Brasília (UTC-3)
 */
const getDataBrasilia = function () {
  const agora = new Date();
  // Converter para horário de Brasília (UTC-3)
  const offsetBrasilia = -3 * 60; // -3 horas em minutos
  const offsetLocal = agora.getTimezoneOffset(); // Offset do servidor em minutos
  const diffMinutos = offsetLocal + offsetBrasilia;

  const dataBrasilia = new Date(agora.getTime() - diffMinutos * 60 * 1000);
  return dataBrasilia;
};

/**
 * HELPER: Adicionar minutos a uma data considerando timezone de Brasília
 */
const adicionarMinutosBrasilia = function (minutos) {
  const agora = getDataBrasilia();
  agora.setMinutes(agora.getMinutes() + minutos);
  return agora;
};

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
    // Usar horário de Brasília
    const expiraEm = adicionarMinutosBrasilia(5); // Código expira em 5 minutos

    console.log("📅 [ARMAZENAR CÓDIGO] Data de expiração (Brasília):", {
      expiraEm: expiraEm.toISOString(),
      expiraEmLocal: expiraEm.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
    });

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

    // Verificar se o código expirou (usando horário de Brasília)
    const agoraBrasilia = getDataBrasilia();
    const expiraEm = new Date(data.expira_em);

    console.log("⏰ [VALIDAR CÓDIGO] Verificação de expiração (Brasília):", {
      agoraBrasilia: agoraBrasilia.toISOString(),
      agoraBrasiliaLocal: agoraBrasilia.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
      expiraEm: expiraEm.toISOString(),
      expiraEmLocal: expiraEm.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
      expirou: agoraBrasilia > expiraEm,
      diferençaMinutos: Math.floor((expiraEm - agoraBrasilia) / 1000 / 60),
    });

    if (agoraBrasilia > expiraEm) {
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
