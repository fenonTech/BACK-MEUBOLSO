/**************************************************************************
 * Objetivo: Controller principal - Replica lógica do webhook n8n
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require('../../modulo/config.js');
const authDAO = require('../../model/DAO/auth.js');
const usuarioDAO = require('../../model/DAO/usuario.js');
const transacaoDAO = require('../../model/DAO/transacao.js');

/**
 * PROCESSAR REQUISIÇÃO PRINCIPAL
 */
const processar = async function (dados, contentType) {
    try {
        if (contentType !== 'application/json') return MESSAGE.ERROR_CONTENT_TYPE;

        const { telefone, codigoTemp, dadosRequisicao } = dados;

        if (!telefone || !codigoTemp || !dadosRequisicao) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        // 1. Validar código
        const validacaoCodigo = authDAO.validarCodigoTemp(telefone, codigoTemp);
        if (!validacaoCodigo.valido) {
            return {
                status: false,
                status_code: 401,
                mensagem: 'expirado'
            };
        }

        // 2. Buscar usuário
        const usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);
        if (!usuario) return MESSAGE.ERROR_NOT_FOUND;

        // 3. Validar assinatura
        const assinatura = await authDAO.selectAssinaturaByTelefone(telefone);
        if (!assinatura || assinatura.erro) {
            if (assinatura.status === 404) {
                return {
                    status: false,
                    status_code: 404,
                    assinatura: 'checkout'
                };
            }
            if (assinatura.status === 403) {
                return {
                    status: false,
                    status_code: 403,
                    assinatura: 'expirado'
                };
            }
            return MESSAGE.ERROR_INTERNAL_SERVER_MODEL;
        }

        // 4. Processar baseado na tela
        const { tela, tipoMetodo } = dadosRequisicao;

        // RECEITA ou DESPESA
        if (tela === 'receita' || tela === 'despesa') {
            return await processarTransacao(usuario.id, tipoMetodo, dadosRequisicao, tela);
        }

        // DASHBOARD
        if (tela === 'dashboard') {
            const transacoes = await transacaoDAO.selectByUserTransacao(usuario.id);
            return {
                status: true,
                status_code: 200,
                nomeUsuario: usuario.nome,
                dados: transacoes
            };
        }

        // CONFIGURAÇÃO
        if (tela === 'configuracao') {
            if (tipoMetodo === 'update') {
                const dadosUpdate = {
                    id: usuario.id,
                    nome: dadosRequisicao.usuarioNome,
                    email: dadosRequisicao.usuarioEmail
                };
                const usuarioAtualizado = await usuarioDAO.updateUsuario(dadosUpdate);

                if (usuarioAtualizado) {
                    return {
                        status: true,
                        status_code: 200,
                        message: 'Usuário atualizado com sucesso!',
                        usuario: usuarioAtualizado
                    };
                }
                return MESSAGE.ERROR_INTERNAL_SERVER_MODEL;
            }

            if (tipoMetodo === 'get') {
                return {
                    status: true,
                    status_code: 200,
                    usuarioNome: usuario.nome,
                    telefone: usuario.telefone,
                    email: usuario.email,
                    prazo: assinatura.prazo,
                    nomePLano: assinatura.nomeAssinatura
                };
            }
        }

        return {
            status: false,
            status_code: 400,
            message: 'Requisição não reconhecida'
        };

    } catch (error) {
        console.log(error);
        return MESSAGE.ERROR_INTERNAL_SERVER_CONTROLLER;
    }
};

/**
 * PROCESSAR TRANSAÇÃO
 */
async function processarTransacao(userId, tipoMetodo, dadosRequisicao, tela) {
    try {
        // POST
        if (tipoMetodo === 'post') {
            const transacao = await transacaoDAO.insertTransacao({
                user_id: userId,
                valor: dadosRequisicao.valor,
                tipo: dadosRequisicao.categoria,
                is_entrada: dadosRequisicao.isEntrada,
                data_pagamento: dadosRequisicao.dataPagamento
            });

            if (transacao) {
                return {
                    status: true,
                    status_code: 201,
                    message: 'Transação criada com sucesso!',
                    transacao
                };
            }
            return MESSAGE.ERROR_INTERNAL_SERVER_MODEL;
        }

        // UPDATE
        if (tipoMetodo === 'update') {
            const transacao = await transacaoDAO.updateTransacao(
                dadosRequisicao.codigoTransacao,
                {
                    valor: dadosRequisicao.valor,
                    tipo: dadosRequisicao.categoria,
                    data_pagamento: dadosRequisicao.dataPagamento
                }
            );

            if (transacao) {
                return {
                    status: true,
                    status_code: 200,
                    message: 'Transação atualizada com sucesso!',
                    transacao
                };
            }
            return MESSAGE.ERROR_INTERNAL_SERVER_MODEL;
        }

        // DELETE
        if (tipoMetodo === 'delete') {
            const result = await transacaoDAO.deleteTransacao(dadosRequisicao.codigoTransacao);

            if (result) {
                return {
                    status: true,
                    status_code: 200,
                    message: 'Transação excluída com sucesso!'
                };
            }
            return MESSAGE.ERROR_INTERNAL_SERVER_MODEL;
        }

        // GET
        if (tipoMetodo === 'get') {
            let transacoes;

            if (tela === 'despesa') {
                transacoes = await transacaoDAO.selectDespesasTransacao(userId);
            } else if (tela === 'receita') {
                transacoes = await transacaoDAO.selectEntradasTransacao(userId);
            }

            return {
                status: true,
                status_code: 200,
                transacoes
            };
        }

        return {
            status: false,
            status_code: 400,
            message: 'Tipo de método não reconhecido'
        };

    } catch (error) {
        console.log(error);
        return MESSAGE.ERROR_INTERNAL_SERVER_CONTROLLER;
    }
}

module.exports = {
    processar
};