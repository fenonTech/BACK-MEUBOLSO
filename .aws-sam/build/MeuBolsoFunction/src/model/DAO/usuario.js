/**************************************************************************
 * Objetivo: DAO responsável pela manipulação de dados de usuários
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require("../../config/supabase.js");

/**
 * INSERIR USUÁRIO
 */
const insertUsuario = async function (dadosUsuario) {
  try {
    // Calcular trial_end: 5 dias a partir de agora (horário de Brasília)
    const agora = new Date();
    const dataBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
    const trialEnd = new Date(dataBrasilia.getTime() + 5 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nome: dadosUsuario.nome,
          telefone: dadosUsuario.telefone,
          email: dadosUsuario.email || null,
          mensagens: dadosUsuario.mensagens || 0,
          plano_id: 1, // Sempre plano gratuito ao criar
          status_plano: "plano gratuito",
          renda_mensal: dadosUsuario.renda_mensal || null,
          trial_end: trialEnd.toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao inserir usuário:", error);
    return false;
  }
};

/**
 * ATUALIZAR USUÁRIO
 */
const updateUsuario = async function (id, dadosUsuario) {
  try {
    const updateData = {};
    if (dadosUsuario.nome !== undefined) updateData.nome = dadosUsuario.nome;
    if (dadosUsuario.telefone !== undefined)
      updateData.telefone = dadosUsuario.telefone;
    if (dadosUsuario.email !== undefined) updateData.email = dadosUsuario.email;
    if (dadosUsuario.mensagens !== undefined)
      updateData.mensagens = dadosUsuario.mensagens;
    if (dadosUsuario.plano_id !== undefined)
      updateData.plano_id = dadosUsuario.plano_id;
    if (dadosUsuario.status_plano !== undefined)
      updateData.status_plano = dadosUsuario.status_plano;
    if (dadosUsuario.renda_mensal !== undefined)
      updateData.renda_mensal = dadosUsuario.renda_mensal;
    if (dadosUsuario.trial_end !== undefined)
      updateData.trial_end = dadosUsuario.trial_end;

    const { data, error } = await supabase
      .from("usuarios")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return false;
  }
};

/**
 * DELETAR USUÁRIO
 */
const deleteUsuario = async function (id) {
  try {
    const { error } = await supabase.from("usuarios").delete().eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return false;
  }
};

/**
 * SELECIONAR TODOS OS USUÁRIOS
 */
const selectAllUsuarios = async function () {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select(
        `
                *,
                planos(id, nome, preco)
            `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return false;
  }
};

/**
 * SELECIONAR USUÁRIO POR ID
 */
const selectByIdUsuario = async function (id) {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar usuário por ID:", error);
    return false;
  }
};

/**
 * SELECIONAR USUÁRIO POR TELEFONE
 */
const selectByTelefoneUsuario = async function (telefone) {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select(
        `
                id,nome, telefone,
                assinaturas(plano_name_cakto,prazo)
            `,
      )
      .eq("telefone", telefone)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar usuário por telefone:", error);
    return false;
  }
};

/**
 * INCREMENTAR MENSAGENS DO USUÁRIO
 */
const incrementarMensagens = async function (id) {
  try {
    const usuario = await selectByIdUsuario(id);
    if (!usuario) return false;

    const novoTotal = (usuario.mensagens || 0) + 1;
    return await updateUsuario(id, { mensagens: novoTotal });
  } catch (error) {
    console.error("Erro ao incrementar mensagens:", error);
    return false;
  }
};

module.exports = {
  insertUsuario,
  updateUsuario,
  deleteUsuario,
  selectAllUsuarios,
  selectByIdUsuario,
  selectByTelefoneUsuario,
  incrementarMensagens,
};
