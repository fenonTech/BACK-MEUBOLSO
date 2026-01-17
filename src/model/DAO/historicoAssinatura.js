/**************************************************************************
 * Objetivo: DAO responsável pela manipulação de histórico de assinaturas
 * Data: 12/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require("../../config/supabase.js");

/**
 * INSERIR REGISTRO NO HISTÓRICO
 */
const insertHistoricoAssinatura = async function (dadosHistorico) {
  try {
    console.log("🔵 [DAO] Iniciando inserção no histórico...");
    console.log("🔵 [DAO] Dados recebidos:", dadosHistorico);

    const insertData = {
      usuariocodigo: dadosHistorico.usuarioCodigo,
      checkout_id: dadosHistorico.checkout_id,
      nome_assinatura: dadosHistorico.nome_assinatura,
      dataassinatura: dadosHistorico.dataAssinatura,
      prazo: dadosHistorico.prazo,
      plano_id_cakto: dadosHistorico.plano_id_cakto,
      plano_id: dadosHistorico.plano_id,
      is_cancelado: dadosHistorico.is_cancelado || false,
    };

    console.log("🔵 [DAO] Dados formatados para insert:", insertData);

    const { data, error } = await supabase
      .from("historico_assinaturas")
      .insert([insertData])
      .select();

    if (error) {
      console.error("❌ [DAO] Erro do Supabase:", error);
      console.error("❌ [DAO] Detalhes do erro:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log("✅ [DAO] Histórico inserido com sucesso:", data[0]);
    return data[0];
  } catch (error) {
    console.error("❌ [DAO] Erro ao inserir histórico de assinatura:", error);
    console.error("❌ [DAO] Stack:", error.stack);
    return false;
  }
};

/**
 * CANCELAR ASSINATURA NO HISTÓRICO (por checkout_id)
 */
const cancelarHistoricoAssinatura = async function (
  checkout_id,
  dataCancelamento,
) {
  try {
    const { data, error } = await supabase
      .from("historico_assinaturas")
      .update({
        is_cancelado: true,
        datacancelamento: dataCancelamento,
      })
      .eq("checkout_id", checkout_id)
      .eq("is_cancelado", false)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao cancelar histórico de assinatura:", error);
    return false;
  }
};

/**
 * SELECIONAR HISTÓRICO POR USUÁRIO
 */
const selectHistoricoByUsuario = async function (usuarioCodigo) {
  try {
    const { data, error } = await supabase
      .from("historico_assinaturas")
      .select("*")
      .eq("usuariocodigo", usuarioCodigo)
      .order("dataassinatura", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar histórico por usuário:", error);
    return false;
  }
};

/**
 * SELECIONAR HISTÓRICO POR CHECKOUT_ID
 */
const selectHistoricoByCheckoutId = async function (checkout_id) {
  try {
    const { data, error } = await supabase
      .from("historico_assinaturas")
      .select("*")
      .eq("checkout_id", checkout_id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar histórico por checkout_id:", error);
    return false;
  }
};

module.exports = {
  insertHistoricoAssinatura,
  cancelarHistoricoAssinatura,
  selectHistoricoByUsuario,
  selectHistoricoByCheckoutId,
};
