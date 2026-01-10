/**************************************************************************
 * Objetivo: Controller responsável pela lógica de autenticação
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require('../modulo/config.js');
const authDAO = require('../model/DAO/auth.js');
const usuarioDAO = require('../model/DAO/usuario.js');
const assinaturaDAO = require('../model/DAO/assinatura.js');

/**
 * ENVIAR CÓDIGO DE AUTENTICAÇÃO
 */
const enviarCodigo = async function (dados, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!dados.telefone) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        // Gerar código de 6 dígitos
        const codigo = authDAO.gerarCodigoTemp();

        // Armazenar código no banco
        const codigoArmazenado = await authDAO.armazenarCodigo(dados.telefone, codigo, dados.is_segundaValidacao || false);

        if (codigoArmazenado) {
            // TODO: Integrar com serviço de envio de SMS (Twilio, etc)
            console.log(`Código enviado para ${dados.telefone}: ${codigo}`);

            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                message: 'Código enviado com sucesso',
                // ATENÇÃO: Em produção, NÃO retornar o código na resposta
                // Apenas para desenvolvimento/testes
                codigo: codigo 
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller enviarCodigo:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * VALIDAR CÓDIGO DE AUTENTICAÇÃO
 */
const validarCodigo = async function (dados, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!dados.telefone || !dados.codigo) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        const codigoValido = await authDAO.validarCodigoTemp(dados.telefone, dados.codigo);

        if (codigoValido) {
            // Buscar ou criar usuário
            let usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

            if (!usuario) {
                // Criar novo usuário se não existir
                usuario = await usuarioDAO.insertUsuario({
                    telefone: dados.telefone,
                    nome: dados.nome || null,
                    email: dados.email || null
                });
            }

            // Deletar código após validação
            await authDAO.deletarCodigo(dados.telefone);

            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                message: 'Código validado com sucesso',
                usuario: usuario
            };
        } else {
            return {
                status: MESSAGE.ERROR_BAD_REQUEST.status,
                status_code: MESSAGE.ERROR_BAD_REQUEST.status_code,
                message: 'Código inválido ou expirado'
            };
        }
    } catch (error) {
        console.error('Erro no controller validarCodigo:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * VALIDAR ASSINATURA DO USUÁRIO
 */
const validarAssinatura = async function (dados, contentType) {
    try {
        if (contentType !== 'application/json') {
            return MESSAGE.ERROR_CONTENT_TYPE;
        }

        if (!dados.telefone) {
            return MESSAGE.ERROR_REQUIRED_FIELDS;
        }

        // Buscar usuário pelo telefone
        const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

        if (!usuario) {
            return {
                status: MESSAGE.ERROR_NOT_FOUND.status,
                status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
                message: 'Usuário não encontrado'
            };
        }

        // Verificar trial_end
        const agora = new Date();
        const trialEnd = new Date(usuario.trial_end);

        if (trialEnd > agora) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                message: 'Período de trial ativo',
                assinaturaAtiva: true,
                tipo: 'trial',
                validade: usuario.trial_end
            };
        }

        // Verificar assinatura paga
        const assinaturaAtiva = await assinaturaDAO.verificarAssinaturaAtiva(usuario.id);

        if (assinaturaAtiva) {
            const assinatura = await assinaturaDAO.selectByUsuarioAssinatura(usuario.id);
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                message: 'Assinatura ativa',
                assinaturaAtiva: true,
                tipo: 'paga',
                assinatura: assinatura
            };
        }

        // Nenhuma assinatura ativa
        return {
            status: MESSAGE.SUCCESS_REQUEST.status,
            status_code: MESSAGE.SUCCESS_REQUEST.status_code,
            message: 'Assinatura inativa ou expirada',
            assinaturaAtiva: false
        };
    } catch (error) {
        console.error('Erro no controller validarAssinatura:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

/**
 * LIMPAR CÓDIGOS EXPIRADOS (Tarefa de Manutenção)
 */
const limparCodigosExpirados = async function () {
    try {
        const resultado = await authDAO.limparCodigosExpirados();

        if (resultado) {
            return {
                status: MESSAGE.SUCCESS_REQUEST.status,
                status_code: MESSAGE.SUCCESS_REQUEST.status_code,
                message: 'Códigos expirados removidos com sucesso'
            };
        } else {
            return MESSAGE.ERROR_INTERNAL_SERVER_DB;
        }
    } catch (error) {
        console.error('Erro no controller limparCodigosExpirados:', error);
        return MESSAGE.ERROR_INTERNAL_SERVER;
    }
};

module.exports = {
    enviarCodigo,
    validarCodigo,
    validarAssinatura,
    limparCodigosExpirados
};
