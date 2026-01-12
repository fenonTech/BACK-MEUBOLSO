/**************************************************************************
 * Objetivo: DAO responsável pela manipulação de dados de assinaturas
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
  const offsetBrasilia = -3 * 60;
  const offsetLocal = agora.getTimezoneOffset();
  const diffMinutos = offsetLocal + offsetBrasilia;
  const dataBrasilia = new Date(agora.getTime() - diffMinutos * 60 * 1000);
  return dataBrasilia;
};

/**
 * INSERIR ASSINATURA
 */
const insertAssinatura = async function (dadosAssinatura) {
  try {
    const insertData = {
      usuarioCodigo: dadosAssinatura.usuarioCodigo,
      prazo: dadosAssinatura.prazo,
      is_cancelado: dadosAssinatura.is_cancelado || false,
      plano_id_cakto: dadosAssinatura.plano_id_cakto,
      plano_name_cakto: dadosAssinatura.plano_name_cakto,
      subscription_id_cakto: dadosAssinatura.subscription_id_cakto,
    };

    // Adicionar created_at se fornecido
    if (dadosAssinatura.created_at) {
      insertData.created_at = dadosAssinatura.created_at;
    }

    const { data, error } = await supabase
      .from("assinaturas")
      .insert([insertData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao inserir assinatura:", error);
    return false;
  }
};

/**
 * ATUALIZAR ASSINATURA
 */
const updateAssinatura = async function (id, dadosAssinatura) {
  try {
    const updateData = {};
    if (dadosAssinatura.prazo !== undefined)
      updateData.prazo = dadosAssinatura.prazo;
    if (dadosAssinatura.is_cancelado !== undefined)
      updateData.is_cancelado = dadosAssinatura.is_cancelado;
    if (dadosAssinatura.dataCancelamento !== undefined)
      updateData.dataCancelamento = dadosAssinatura.dataCancelamento;
    if (dadosAssinatura.plano_id_cakto !== undefined)
      updateData.plano_id_cakto = dadosAssinatura.plano_id_cakto;
    if (dadosAssinatura.plano_name_cakto !== undefined)
      updateData.plano_name_cakto = dadosAssinatura.plano_name_cakto;
    if (dadosAssinatura.subscription_id_cakto !== undefined)
      updateData.subscription_id_cakto = dadosAssinatura.subscription_id_cakto;

    const { data, error } = await supabase
      .from("assinaturas")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao atualizar assinatura:", error);
    return false;
  }
};

/**
 * CANCELAR ASSINATURA
 */
const cancelarAssinatura = async function (id) {
  try {
    const { data, error } = await supabase
      .from("assinaturas")
      .update({
        is_cancelado: true,
        dataCancelamento: getDataBrasilia().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);
    return false;
  }
};

/**
 * DELETAR ASSINATURA
 */
const deleteAssinatura = async function (id) {
  try {
    const { error } = await supabase.from("assinaturas").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao deletar assinatura:", error);
    return false;
  }
};

/**
 * SELECIONAR ASSINATURA POR ID
 */
const selectByIdAssinatura = async function (id) {
  try {
    const { data, error } = await supabase
      .from("assinaturas")
      .select(
        `
                *,
                usuarios(id, nome, telefone, email)
            `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar assinatura por ID:", error);
    return false;
  }
};

/**
 * SELECIONAR ASSINATURA POR USUÁRIO (incluindo canceladas)
 */
const selectByUsuarioAssinatura = async function (usuarioCodigo) {
  try {
    const { data, error } = await supabase
      .from("assinaturas")
      .select("*")
      .eq("usuarioCodigo", usuarioCodigo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Erro ao buscar assinatura por usuário:", error);
    return null;
  }
};

/**
 * SELECIONAR ASSINATURA POR SUBSCRIPTION_ID (CAKTO)
 */
const selectBySubscriptionId = async function (subscription_id_cakto) {
  try {
    const { data, error } = await supabase
      .from("assinaturas")
      .select(
        `
                *,
                usuarios(id, nome, telefone, email)
            `
      )
      .eq("subscription_id_cakto", subscription_id_cakto)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar assinatura por subscription_id:", error);
    return false;
  }
};

/**
 * VERIFICAR SE ASSINATURA ESTÁ ATIVA E VÁLIDA
 */
const verificarAssinaturaAtiva = async function (usuarioCodigo) {
  try {
    const assinatura = await selectByUsuarioAssinatura(usuarioCodigo);

    if (!assinatura) return false;

    const hoje = getDataBrasilia();
    const prazo = new Date(assinatura.prazo);

    return !assinatura.is_cancelado && prazo >= hoje;
  } catch (error) {
    console.error("Erro ao verificar assinatura ativa:", error);
    return false;
  }
};

/**
 * SELECIONAR TODAS AS ASSINATURAS
 */
const selectAllAssinaturas = async function () {
  try {
    const { data, error } = await supabase
      .from("assinaturas")
      .select(
        `
                *,
                usuarios(id, nome, telefone, email)
            `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
    return false;
  }
};

module.exports = {
  insertAssinatura,
  updateAssinatura,
  cancelarAssinatura,
  deleteAssinatura,
  selectByIdAssinatura,
  selectByUsuarioAssinatura,
  selectBySubscriptionId,
  verificarAssinaturaAtiva,
  selectAllAssinaturas,
};
