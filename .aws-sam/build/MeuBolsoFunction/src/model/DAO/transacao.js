/**************************************************************************
 * Objetivo: DAO responsável pela manipulação de dados de transações
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require("../../config/supabase.js");

/**
 * INSERIR TRANSAÇÃO
 */
const insertTransacao = async function (dadosTransacao) {
  try {
    // Obter data/hora de Brasília (UTC-3)
    const now = new Date();
    const utcTime = now.getTime();
    const brasiliaOffsetMs = -3 * 60 * 60 * 1000; // UTC-3 em milissegundos
    const brasiliaTime = new Date(utcTime + brasiliaOffsetMs);

    // Formatar para timestamp sem timezone (timestamp with time zone do PostgreSQL interpretará como UTC)
    const timestamp = brasiliaTime.toISOString().slice(0, 19).replace("T", " ");

    const transacaoData = {
      user_id: dadosTransacao.user_id,
      descricao: dadosTransacao.descricao || null,
      valor: dadosTransacao.valor,
      tipo: dadosTransacao.tipo || null,
      is_entrada: dadosTransacao.is_entrada,
      data_pagamento: dadosTransacao.data_pagamento,
      created_at: dadosTransacao.created_at || timestamp,
    };

    const { data, error } = await supabase
      .from("transacoes")
      .insert([transacaoData])
      .select();

    if (error) {
      console.error("Erro Supabase ao inserir transação:", error);
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error("Erro ao inserir transação:", error);
    return false;
  }
};

/**
 * ATUALIZAR TRANSAÇÃO
 */
const updateTransacao = async function (codigo, dadosTransacao) {
  try {
    const updateData = {};
    if (dadosTransacao.descricao !== undefined)
      updateData.descricao = dadosTransacao.descricao;
    if (dadosTransacao.valor !== undefined)
      updateData.valor = dadosTransacao.valor;
    if (dadosTransacao.tipo !== undefined)
      updateData.tipo = dadosTransacao.tipo;
    if (dadosTransacao.is_entrada !== undefined)
      updateData.is_entrada = dadosTransacao.is_entrada;
    if (dadosTransacao.data_pagamento !== undefined)
      updateData.data_pagamento = dadosTransacao.data_pagamento;

    const { data, error } = await supabase
      .from("transacoes")
      .update(updateData)
      .eq("codigo", codigo)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao atualizar transação:", error);
    return false;
  }
};

/**
 * DELETAR TRANSAÇÃO
 */
const deleteTransacao = async function (codigo) {
  try {
    const { error } = await supabase
      .from("transacoes")
      .delete()
      .eq("codigo", codigo);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    return false;
  }
};

/**
 * SELECIONAR TODAS AS TRANSAÇÕES DE UM USUÁRIO
 */
const selectAllTransacoesByUser = async function (user_id, filters = {}) {
  try {
    let query = supabase.from("transacoes").select("*").eq("user_id", user_id);

    // Aplicar filtros se fornecidos
    if (filters.mes && filters.ano) {
      const mesStr = filters.mes.toString().padStart(2, "0");
      const inicioMes = `${filters.ano}-${mesStr}-01`;
      const fimMes = new Date(filters.ano, filters.mes, 0).getDate();
      const fimMesStr = `${filters.ano}-${mesStr}-${fimMes}`;

      query = query
        .gte("data_pagamento", inicioMes)
        .lte("data_pagamento", fimMesStr);
    } else if (filters.ano) {
      query = query
        .gte("data_pagamento", `${filters.ano}-01-01`)
        .lte("data_pagamento", `${filters.ano}-12-31`);
    }

    const { data, error } = await query.order("data_pagamento", {
      ascending: false,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return false;
  }
};

/**
 * SELECIONAR TRANSAÇÃO POR CÓDIGO
 */
const selectByCodigoTransacao = async function (codigo) {
  try {
    const { data, error } = await supabase
      .from("transacoes")
      .select("*")
      .eq("codigo", codigo)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar transação por código:", error);
    return false;
  }
};

/**
 * SELECIONAR DESPESAS DE UM USUÁRIO (is_entrada = false)
 */
const selectDespesasTransacao = async function (user_id, filters = {}) {
  try {
    let query = supabase
      .from("transacoes")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_entrada", false);

    // Filtros opcionais
    if (filters.mes && filters.ano) {
      const dataInicio = `${filters.ano}-${String(filters.mes).padStart(
        2,
        "0"
      )}-01`;
      const dataFim = new Date(filters.ano, filters.mes, 0)
        .toISOString()
        .split("T")[0];
      query = query
        .gte("data_pagamento", dataInicio)
        .lte("data_pagamento", dataFim);
    }
    query = query.order("data_pagamento", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    return false;
  }
};

/**
 * SELECIONAR ENTRADAS DE UM USUÁRIO (is_entrada = true)
 */
const selectEntradasTransacao = async function (user_id, filters = {}) {
  try {
    let query = supabase
      .from("transacoes")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_entrada", true);

    // Filtros opcionais
    if (filters.mes && filters.ano) {
      const dataInicio = `${filters.ano}-${String(filters.mes).padStart(
        2,
        "0"
      )}-01`;
      const dataFim = new Date(filters.ano, filters.mes, 0)
        .toISOString()
        .split("T")[0];
      query = query
        .gte("data_pagamento", dataInicio)
        .lte("data_pagamento", dataFim);
    }

    query = query.order("data_pagamento", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar entradas:", error);
    return false;
  }
};

/**
 * CALCULAR TOTAIS (ENTRADAS E DESPESAS) DE UM USUÁRIO
 */
const calcularTotais = async function (user_id, filters = {}) {
  try {
    let query = supabase
      .from("transacoes")
      .select("valor, is_entrada")
      .eq("user_id", user_id);

    // Filtros opcionais
    if (filters.mes && filters.ano) {
      const dataInicio = `${filters.ano}-${String(filters.mes).padStart(
        2,
        "0"
      )}-01`;
      const dataFim = new Date(filters.ano, filters.mes, 0)
        .toISOString()
        .split("T")[0];
      query = query
        .gte("data_pagamento", dataInicio)
        .lte("data_pagamento", dataFim);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totais = {
      entradas: 0,
      despesas: 0,
      saldo: 0,
    };

    data.forEach((transacao) => {
      if (transacao.is_entrada) {
        totais.entradas += parseFloat(transacao.valor);
      } else {
        totais.despesas += parseFloat(transacao.valor);
      }
    });

    totais.saldo = totais.entradas - totais.despesas;

    return totais;
  } catch (error) {
    console.error("Erro ao calcular totais:", error);
    return false;
  }
};

module.exports = {
  insertTransacao,
  updateTransacao,
  deleteTransacao,
  selectAllTransacoesByUser,
  selectByCodigoTransacao,
  selectDespesasTransacao,
  selectEntradasTransacao,
  calcularTotais,
};
