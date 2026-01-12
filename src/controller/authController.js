/**************************************************************************
 * Objetivo: Controller responsável pela lógica de autenticação
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const jwt = require("jsonwebtoken");
const MESSAGE = require("../modulo/config.js");
const authDAO = require("../model/DAO/auth.js");
const usuarioDAO = require("../model/DAO/usuario.js");
const assinaturaDAO = require("../model/DAO/assinatura.js");

/**
 * HELPER: Obter data/hora atual no horário de Brasília (UTC-3)
 */
const getDataBrasilia = function () {
  const agora = new Date();
  // Converter para horário de Brasília (UTC-3)
  const offsetBrasilia = -3 * 60; // -3 horas em minutos
  const offsetLocal = agora.getTimezoneOffset(); // Offset do servidor em minutos
  const diffMinutos = offsetLocal + offsetBrasilia;
  
  const dataBrasilia = new Date(agora.getTime() - diffMinutos * 60 * 1000);
  return dataBrasilia;
};

/**
 * ENVIAR CÓDIGO DE AUTENTICAÇÃO
 */
const enviarCodigo = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // Gerar código de 6 dígitos
    const codigo = authDAO.gerarCodigoTemp();

    // Armazenar código no banco
    const codigoArmazenado = await authDAO.armazenarCodigo(
      dados.telefone,
      codigo,
      dados.is_segundaValidacao || false
    );

    if (codigoArmazenado) {
      // TODO: Integrar com serviço de envio de SMS (Twilio, etc)
      console.log(`Código enviado para ${dados.telefone}: ${codigo}`);

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Código enviado com sucesso",
        // ATENÇÃO: Em produção, NÃO retornar o código na resposta
        // Apenas para desenvolvimento/testes
        codigo: codigo,
      };
    } else {
      return MESSAGE.ERROR_INTERNAL_SERVER_DB;
    }
  } catch (error) {
    console.error("Erro no controller enviarCodigo:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * VALIDAR CÓDIGO DE AUTENTICAÇÃO
 */
const validarCodigo = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone || !dados.codigo) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    const codigoValido = await authDAO.validarCodigoTemp(
      dados.telefone,
      dados.codigo
    );

    if (codigoValido) {
      // Buscar dados do usuário pelo telefone
      const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

      if (!usuario) {
        return {
          status: MESSAGE.ERROR_NOT_FOUND.status,
          status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
          message: "Usuário não encontrado",
        };
      }

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Código validado com sucesso",
        usuario: usuario,
      };
    } else {
      return {
        status: MESSAGE.ERROR_BAD_REQUEST.status,
        status_code: MESSAGE.ERROR_BAD_REQUEST.status_code,
        message: "Código inválido ou expirado",
      };
    }
  } catch (error) {
    console.error("Erro no controller validarCodigo:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * VALIDAR ASSINATURA DO USUÁRIO
 */
const validarAssinatura = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
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
        message: "Usuário não encontrado",
      };
    }

    // Verificar trial_end (usando horário de Brasília)
    const agora = getDataBrasilia();
    const trialEnd = new Date(usuario.trial_end);

    if (trialEnd > agora) {
      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Período de trial ativo",
        assinaturaAtiva: true,
        tipo: "trial",
        validade: usuario.trial_end,
      };
    }

    // Verificar assinatura paga
    const assinaturaAtiva = await assinaturaDAO.verificarAssinaturaAtiva(
      usuario.id
    );

    if (assinaturaAtiva) {
      const assinatura = await assinaturaDAO.selectByUsuarioAssinatura(
        usuario.id
      );
      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Assinatura ativa",
        assinaturaAtiva: true,
        tipo: "paga",
        assinatura: assinatura,
      };
    }

    // Nenhuma assinatura ativa
    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      message: "Assinatura inativa ou expirada",
      assinaturaAtiva: false,
    };
  } catch (error) {
    console.error("Erro no controller validarAssinatura:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * LOGIN COMPLETO (VALIDA CÓDIGO + ASSINATURA + RETORNA JWT)
 */
const login = async function (dados, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!dados.telefone || !dados.codigo) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // 1. Validar código temporário
    const codigoValido = await authDAO.validarCodigoTemp(
      dados.telefone,
      dados.codigo
    );

    if (!codigoValido) {
      return {
        status: MESSAGE.ERROR_BAD_REQUEST.status,
        status_code: MESSAGE.ERROR_BAD_REQUEST.status_code,
        message: "Código inválido ou expirado",
      };
    }

    // 2. Buscar usuário
    const usuario = await usuarioDAO.selectByTelefoneUsuario(dados.telefone);

    if (!usuario) {
      return {
        status: MESSAGE.ERROR_NOT_FOUND.status,
        status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
        message: "Usuário não encontrado",
      };
    }

    // 3. Verificar assinatura (usando horário de Brasília)
    let assinaturaAtiva = false;
    let assinaturaTipo = null;
    let assinaturaValidade = null;

    const agora = getDataBrasilia();
    if (usuario.trial_end) {
      const trialEnd = new Date(usuario.trial_end);
      if (trialEnd > agora) {
        assinaturaAtiva = true;
        assinaturaTipo = "trial";
        assinaturaValidade = usuario.trial_end;
      }
    }

    if (!assinaturaAtiva) {
      const assinaturaPaga = await assinaturaDAO.verificarAssinaturaAtiva(
        usuario.id
      );
      if (assinaturaPaga) {
        const assinatura = await assinaturaDAO.selectByUsuarioAssinatura(
          usuario.id
        );
        assinaturaAtiva = true;
        assinaturaTipo = "paga";
        assinaturaValidade = assinatura?.validade_fim;
      }
    }

    // 4. Gerar JWT Token
    const tokenPayload = {
      id: usuario.id,
      telefone: usuario.telefone,
      nome: usuario.nome,
      email: usuario.email,
    };

    // JWT Secret fixo
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key_here";
    const jwtExpires = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: jwtExpires,
    });

    // NOTA: O código NÃO é deletado após login
    // Pode ser reutilizado até expirar (5 minutos)
    // Apenas será atualizado quando um novo código for solicitado

    // 5. Retornar resposta
    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      message: "Login realizado com sucesso",
      token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        telefone: usuario.telefone,
        email: usuario.email,
        mensagens: usuario.mensagens,
        plano_id: usuario.plano_id,
        status_plano: usuario.status_plano,
      },
      assinatura: {
        ativa: assinaturaAtiva,
        tipo: assinaturaTipo,
        validade: assinaturaValidade,
      },
    };
  } catch (error) {
    console.error("Erro no controller login:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

module.exports = {
  enviarCodigo,
  validarCodigo,
  validarAssinatura,
  login,
};
