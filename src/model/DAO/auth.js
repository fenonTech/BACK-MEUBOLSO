/**************************************************************************
 * Objetivo: DAO responsável pela autenticação e códigos temporários
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const supabase = require('../../config/supabase.js');

/**
 * GERAR CÓDIGO TEMPORÁRIO (6 dígitos)
 */
const gerarCodigoTemp = function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * INSERIR OU ATUALIZAR CÓDIGO TEMPORÁRIO
 */
const armazenarCodigo = async function (telefone, codigo, is_segundaValidacao = false) {
    try {
        const expiraEm = new Date();
        expiraEm.setMinutes(expiraEm.getMinutes() + 5); // Código expira em 5 minutos

        // Verificar se já existe um código para este telefone
        const { data: codigoExistente } = await supabase
            .from('codigo_temp')
            .select('*')
            .eq('telefone', telefone)
            .single();

        if (codigoExistente) {
            // Atualizar código existente
            const { data, error } = await supabase
                .from('codigo_temp')
                .update({
                    codigo: codigo,
                    expira_em: expiraEm.toISOString(),
                    is_segundaValidacao: is_segundaValidacao
                })
                .eq('telefone', telefone)
                .select();

            if (error) throw error;
            return data[0];
        } else {
            // Inserir novo código
            const { data, error } = await supabase
                .from('codigo_temp')
                .insert([{
                    telefone: telefone,
                    codigo: codigo,
                    expira_em: expiraEm.toISOString(),
                    is_segundaValidacao: is_segundaValidacao
                }])
                .select();

            if (error) throw error;
            return data[0];
        }
    } catch (error) {
        console.error('Erro ao armazenar código:', error);
        return false;
    }
};

/**
 * VALIDAR CÓDIGO TEMPORÁRIO
 */
const validarCodigoTemp = async function (telefone, codigo) {
    try {
        const { data, error } = await supabase
            .from('codigo_temp')
            .select('*')
            .eq('telefone', telefone)
            .eq('codigo', codigo)
            .single();

        if (error || !data) {
            console.log('Código não encontrado');
            return false;
        }

        // Verificar se o código expirou
        const agora = new Date();
        const expiraEm = new Date(data.expira_em);

        if (agora > expiraEm) {
            console.log('Código expirado');
            return false;
        }

        return data;
    } catch (error) {
        console.error('Erro ao validar código:', error);
        return false;
    }
};

/**
 * DELETAR CÓDIGO APÓS VALIDAÇÃO
 */
const deletarCodigo = async function (telefone) {
    try {
        const { error } = await supabase
            .from('codigo_temp')
            .delete()
            .eq('telefone', telefone);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao deletar código:', error);
        return false;
    }
};

/**
 * BUSCAR CÓDIGO POR TELEFONE
 */
const selectByTelefoneCodigo = async function (telefone) {
    try {
        const { data, error } = await supabase
            .from('codigo_temp')
            .select('*')
            .eq('telefone', telefone)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar código por telefone:', error);
        return false;
    }
};

/**
 * LIMPAR CÓDIGOS EXPIRADOS (Manutenção)
 */
const limparCodigosExpirados = async function () {
    try {
        const agora = new Date().toISOString();

        const { error } = await supabase
            .from('codigo_temp')
            .delete()
            .lt('expira_em', agora);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao limpar códigos expirados:', error);
        return false;
    }
};

module.exports = {
    gerarCodigoTemp,
    armazenarCodigo,
    validarCodigoTemp,
    deletarCodigo,
    selectByTelefoneCodigo,
    limparCodigosExpirados
};
