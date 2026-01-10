/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de assinaturas
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require('../../modulo/config.js');
const assinaturaDAO = require('../../model/DAO/assinatura.js');
const usuarioDAO = require('../../model/DAO/usuario.js');

/**
 * CRIAR ASSINATURA
 */
const criarAssinatura = async function (assinatura, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!assinatura.usuarioCodigo || !assinatura.prazo || !assinatura.plano_id_cakto || !assinatura.subscription_id_cakto) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        // Verificar se o usuário existe
        const usuario = await usuarioDAO.selectByIdUsuario(assinatura.usuarioCodigo);
        if (!usuario) {
            return {
                status: MESSAGE.ERROR_NOT_FOUND.status,
                status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
                message: 'Usuário não encontrado'
            };
        }

        const novaAssinatura = await assinaturaDAO.insertAssinatura(assinatura);

        if (novaAssinatura) {
            return {
                status: MESSAGE.SUCCESS_CREATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_CREATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_CREATED_ITEM.message,
                assinatura: novaAssinatura
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller criarAssinatura:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * ATUALIZAR ASSINATURA
 */
const atualizarAssinatura = async function (id, assinatura, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const assinaturaAtualizada = await assinaturaDAO.updateAssinatura(id, assinatura);

        if (assinaturaAtualizada) {
            return {
                status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_UPDATED_ITEM.message,
                assinatura: assinaturaAtualizada
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller atualizarAssinatura:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * CANCELAR ASSINATURA
 */
const cancelarAssinatura = async function (id) {
    try {
        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const assinaturaCancelada = await assinaturaDAO.cancelarAssinatura(id);

        if (assinaturaCancelada) {
            return {
                status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
                message: 'Assinatura cancelada com sucesso',
                assinatura: assinaturaCancelada
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller cancelarAssinatura:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * BUSCAR ASSINATURA POR ID
 */
const buscarAssinaturaPorId = async function (id) {
    try {
        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const assinatura = await assinaturaDAO.selectByIdAssinatura(id);

        if (assinatura) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                assinatura: assinatura
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller buscarAssinaturaPorId:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * BUSCAR ASSINATURA POR USUÁRIO
 */
const buscarAssinaturaPorUsuario = async function (usuarioCodigo) {
    try {
        if (!usuarioCodigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const assinatura = await assinaturaDAO.selectByUsuarioAssinatura(usuarioCodigo);

        if (assinatura) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                assinatura: assinatura
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller buscarAssinaturaPorUsuario:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * VERIFICAR SE ASSINATURA ESTÁ ATIVA
 */
const verificarAssinaturaAtiva = async function (usuarioCodigo) {
    try {
        if (!usuarioCodigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const ativa = await assinaturaDAO.verificarAssinaturaAtiva(usuarioCodigo);

        return {
            status: MESSAGE.SUCCESS_REQUEST.status,
            status_code: MESSAGE.SUCCESS_REQUEST.status_code,
            assinaturaAtiva: ativa
        };
    } catch (error) {
        console.error('Erro no controller verificarAssinaturaAtiva:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LISTAR TODAS AS ASSINATURAS
 */
const listarAssinaturas = async function () {
    try {
        const assinaturas = await assinaturaDAO.selectAllAssinaturas();

        if (assinaturas && assinaturas.length > 0) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                quantidade: assinaturas.length,
                assinaturas: assinaturas
            };
        } else if (assinaturas && assinaturas.length === 0) {
            return MESSAGE.ERROR_NOT_FOUND;
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller listarAssinaturas:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

module.exports = {
    criarAssinatura,
    atualizarAssinatura,
    cancelarAssinatura,
    buscarAssinaturaPorId,
    buscarAssinaturaPorUsuario,
    verificarAssinaturaAtiva,
    listarAssinaturas
};
