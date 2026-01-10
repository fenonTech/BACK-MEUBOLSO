/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de usuários
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require('../../modulo/config.js');
const usuarioDAO = require('../../model/DAO/usuario.js');

/**
 * INSERIR USUÁRIO
 */
const inserirUsuario = async function (usuario, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!usuario.nome || !usuario.telefone) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const novoUsuario = await usuarioDAO.insertUsuario(usuario);

        if (novoUsuario) {
            return {
                status: MESSAGE.SUCCESS_CREATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_CREATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_CREATED_ITEM.message,
                usuario: novoUsuario
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller inserirUsuario:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * ATUALIZAR USUÁRIO
 */
const atualizarUsuario = async function (id, usuario, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const usuarioAtualizado = await usuarioDAO.updateUsuario(id, usuario);

        if (usuarioAtualizado) {
            return {
                status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
                message: MESSAGE.SUCCESS_UPDATED_ITEM.message,
                usuario: usuarioAtualizado
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller atualizarUsuario:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * EXCLUIR USUÁRIO
 */
const excluirUsuario = async function (id) {
    try {
        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const resultado = await usuarioDAO.deleteUsuario(id);

        if (resultado) {
            return MESSAGE.SUCCESS_DELETED_ITEM;
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller excluirUsuario:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LISTAR TODOS OS USUÁRIOS
 */
const listarUsuarios = async function () {
    try {
        const usuarios = await usuarioDAO.selectAllUsuarios();

        if (usuarios && usuarios.length > 0) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                quantidade: usuarios.length,
                usuarios: usuarios
            };
        } else if (usuarios && usuarios.length === 0) {
            return MESSAGE.ERROR_NOT_FOUND;
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller listarUsuarios:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * BUSCAR USUÁRIO POR ID
 */
const buscarUsuarioPorId = async function (id) {
    try {
        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const usuario = await usuarioDAO.selectByIdUsuario(id);

        if (usuario) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                usuario: usuario
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller buscarUsuarioPorId:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * BUSCAR USUÁRIO POR TELEFONE
 */
const buscarUsuarioPorTelefone = async function (telefone) {
    try {
        if (!telefone) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);

        if (usuario) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                usuario: usuario
            };
        } else {
            return MESSAGE.ERROR_NOT_FOUND;
        }
    } catch (error) {
        console.error('Erro no controller buscarUsuarioPorTelefone:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * INCREMENTAR MENSAGENS DO USUÁRIO
 */
const incrementarMensagens = async function (id) {
    try {
        if (!id) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const resultado = await usuarioDAO.incrementarMensagens(id);

        if (resultado) {
            return {
                status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
                status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
                message: 'Mensagem incrementada com sucesso'
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller incrementarMensagens:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

module.exports = {
    inserirUsuario,
    atualizarUsuario,
    excluirUsuario,
    listarUsuarios,
    buscarUsuarioPorId,
    buscarUsuarioPorTelefone,
    incrementarMensagens
};
