/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de transações
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require('../../modulo/config.js');
const transacaoDAO = require('../../model/DAO/transacao.js');
const usuarioDAO = require('../../model/DAO/usuario.js');

/**
 * INSERIR TRANSAÇÃO
 */
const inserirTransacao = async function (transacao, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!transacao.user_id || !transacao.valor || transacao.is_entrada === undefined || !transacao.data_pagamento) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        // Verificar se o usuário existe
        const usuario = await usuarioDAO.selectByIdUsuario(transacao.user_id);
        if (!usuario) {
            return {
                status: MESSAGE.ERROR_NOT_FOUND.status,
                status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
                message: 'Usuário não encontrado'
            };
        }

        const novaTransacao = await transacaoDAO.insertTransacao(transacao);

        if (novaTransacao) {
            return {
                status: MESSAGE.SUCCESS_CREATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_CREATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_CREATED_ITEM.message,
                transacao: novaTransacao
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller inserirTransacao:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * ATUALIZAR TRANSAÇÃO
 */
const atualizarTransacao = async function (codigo, transacao, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!codigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const transacaoAtualizada = await transacaoDAO.updateTransacao(codigo, transacao);

        if (transacaoAtualizada) {
            return {
                status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_UPDATED_ITEM.message,
                transacao: transacaoAtualizada
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller atualizarTransacao:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * EXCLUIR TRANSAÇÃO
 */
const excluirTransacao = async function (codigo) {
    try {
        if (!codigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const resultado = await transacaoDAO.deleteTransacao(codigo);

        if (resultado) {
            return MESSAGE.SUCCESS_DELETED_ITEM;
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller excluirTransacao:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LISTAR TRANSAÇÕES POR USUÁRIO
 */
const listarTransacoesPorUsuario = async function (user_id) {
    try {
        if (!user_id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const transacoes = await transacaoDAO.selectAllTransacoesByUser(user_id);

        if (transacoes && transacoes.length > 0) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                quantidade: transacoes.length,
                transacoes: transacoes
            };
        } else if (transacoes && transacoes.length === 0) {
            return MESSAGE.ERROR_NOT_FOUND;
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller listarTransacoesPorUsuario:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * BUSCAR TRANSAÇÃO POR CÓDIGO
 */
const buscarTransacaoPorCodigo = async function (codigo) {
    try {
        if (!codigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const transacao = await transacaoDAO.selectByCodigoTransacao(codigo);

        if (transacao) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                transacao: transacao
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller buscarTransacaoPorCodigo:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LISTAR DESPESAS DO USUÁRIO
 */
const listarDespesas = async function (user_id, filters = {}) {
    try {
        if (!user_id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const despesas = await transacaoDAO.selectDespesasTransacao(user_id, filters);

        if (despesas && despesas.length > 0) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                quantidade: despesas.length,
                despesas: despesas
            };
        } else if (despesas && despesas.length === 0) {
            return MESSAGE.ERROR_NOT_FOUND;
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller listarDespesas:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LISTAR ENTRADAS DO USUÁRIO
 */
const listarEntradas = async function (user_id, filters = {}) {
    try {
        if (!user_id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const entradas = await transacaoDAO.selectEntradasTransacao(user_id, filters);

        if (entradas && entradas.length > 0) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                quantidade: entradas.length,
                entradas: entradas
            };
        } else if (entradas && entradas.length === 0) {
            return MESSAGE.ERROR_NOT_FOUND;
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller listarEntradas:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * OBTER RESUMO FINANCEIRO (DASHBOARD)
 */
const obterResumo = async function (user_id, filters = {}) {
    try {
        if (!user_id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const totais = await transacaoDAO.calcularTotais(user_id, filters);

        if (totais) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                resumo: totais
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller obterResumo:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

module.exports = {
    inserirTransacao,
    atualizarTransacao,
    excluirTransacao,
    listarTransacoesPorUsuario,
    buscarTransacaoPorCodigo,
    listarDespesas,
    listarEntradas,
    obterResumo
};
