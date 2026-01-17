/**************************************************************************
 * Objetivo: DAO responsável pela manipulação de dados de planos e serviços
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require('../../config/supabase.js');

// =================== PLANOS ===================

/**
 * SELECIONAR TODOS OS PLANOS
 */
const selectAllPlanos = async function () {
    try {
        const { data, error } = await supabase
            .from('planos')
            .select(`
                *,
                servicos(id, nome)
            `)
            .order('preco', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar planos:', error);
        return false;
    }
};

/**
 * SELECIONAR PLANO POR ID
 */
const selectByIdPlano = async function (id) {
    try {
        const { data, error } = await supabase
            .from('planos')
            .select(`
                *,
                servicos(id, nome)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar plano por ID:', error);
        return false;
    }
};

// =================== SERVIÇOS ===================

/**
 * SELECIONAR TODOS OS SERVIÇOS
 */
const selectAllServicos = async function () {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        return false;
    }
};

/**
 * SELECIONAR SERVIÇO POR ID
 */
const selectByIdServico = async function (id) {
    try {
        const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar serviço por ID:', error);
        return false;
    }
};

module.exports = {
    selectAllPlanos,
    selectByIdPlano,
    selectAllServicos,
    selectByIdServico
};
