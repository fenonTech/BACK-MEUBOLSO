/**************************************************************************
 * Objetivo: DAO para persistência de pagamentos
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const supabase = require("../../config/supabase.js");

const TABELA = "pagamentos";

const salvarOuAtualizarPagamento = async function (dadosPagamento) {
  try {
    const providerPaymentId = dadosPagamento.provider_payment_id;

    if (!providerPaymentId) {
      return {
        status: false,
        message: "provider_payment_id é obrigatório para persistência.",
      };
    }

    const { data: existente, error: erroBusca } = await supabase
      .from(TABELA)
      .select("id")
      .eq("provider_payment_id", providerPaymentId)
      .limit(1)
      .maybeSingle();

    if (erroBusca) throw erroBusca;

    if (existente?.id) {
      const { data, error } = await supabase
        .from(TABELA)
        .update({ ...dadosPagamento, updated_at: new Date().toISOString() })
        .eq("provider_payment_id", providerPaymentId)
        .select()
        .single();

      if (error) throw error;

      return {
        status: true,
        action: "updated",
        data,
      };
    }

    const { data, error } = await supabase
      .from(TABELA)
      .insert([{ ...dadosPagamento, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;

    return {
      status: true,
      action: "inserted",
      data,
    };
  } catch (error) {
    return {
      status: false,
      message: error.message,
      error,
    };
  }
};

module.exports = {
  salvarOuAtualizarPagamento,
};
