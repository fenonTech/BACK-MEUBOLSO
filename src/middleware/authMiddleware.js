/**************************************************************************
 * Objetivo: Middleware de autenticação JWT com validação de assinatura
 * Data: 11/01/2026
 * Autor: Sistema
 * Versão: 1.0
 **************************************************************************/

const jwt = require("jsonwebtoken");
const MESSAGE = require("../modulo/config.js");
const assinaturaDAO = require("../model/DAO/assinatura.js");
const usuarioDAO = require("../model/DAO/usuario.js");

/**
 * MIDDLEWARE: Verificar Token JWT
 */
const verificarToken = async (request, response, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return response.status(401).json({
        status: false,
        status_code: 401,
        message: "Token não fornecido. Faça login primeiro.",
      });
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return response.status(401).json({
        status: false,
        status_code: 401,
        message: "Formato de token inválido. Use: Bearer TOKEN",
      });
    }

    const token = parts[1];

    // JWT Secret fixo
    const jwtSecret = process.env.JWT_SECRET || 'your_secret_key_here';

    // Verificar e decodificar o token
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return response.status(401).json({
          status: false,
          status_code: 401,
          message: "Token inválido ou expirado. Faça login novamente.",
        });
      }

      // Anexar informações do usuário ao request
      request.usuarioId = decoded.id;
      request.usuarioTelefone = decoded.telefone;
      request.usuarioNome = decoded.nome;

      next();
    });
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    return response.status(500).json(MESSAGE.ERROR_INTERNAL_SERVER);
  }
};

/**
 * MIDDLEWARE: Verificar Assinatura Ativa
 */
const verificarAssinatura = async (request, response, next) => {
  try {
    const usuarioId = request.usuarioId;

    // Buscar dados do usuário
    const usuario = await usuarioDAO.selectByIdUsuario(usuarioId);

    if (!usuario) {
      return response.status(404).json({
        status: false,
        status_code: 404,
        message: "Usuário não encontrado",
      });
    }

    // Verificar trial_end primeiro
    const agora = new Date();
    if (usuario.trial_end) {
      const trialEnd = new Date(usuario.trial_end);
      if (trialEnd > agora) {
        // Trial ativo
        request.assinaturaTipo = "trial";
        request.assinaturaValida = usuario.trial_end;
        return next();
      }
    }

    // Verificar assinatura paga
    const assinaturaAtiva = await assinaturaDAO.verificarAssinaturaAtiva(
      usuarioId
    );

    if (assinaturaAtiva) {
      const assinatura = await assinaturaDAO.selectByUsuarioAssinatura(
        usuarioId
      );
      request.assinaturaTipo = "paga";
      request.assinaturaValida = assinatura?.validade_fim;
      return next();
    }

    // Nenhuma assinatura ativa
    return response.status(403).json({
      status: false,
      status_code: 403,
      message:
        "Assinatura expirada ou inativa. Renove sua assinatura para continuar.",
    });
  } catch (error) {
    console.error("Erro ao verificar assinatura:", error);
    return response.status(500).json(MESSAGE.ERROR_INTERNAL_SERVER);
  }
};

/**
 * MIDDLEWARE: Combinado (Token + Assinatura)
 */
const autenticar = [verificarToken, verificarAssinatura];

module.exports = {
  verificarToken,
  verificarAssinatura,
  autenticar,
};
