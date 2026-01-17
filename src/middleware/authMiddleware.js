/**************************************************************************
 * Objetivo: Middleware de autenticação JWT com validação de assinatura
 * Data: 11/01/2026
 * Autor: Sistema
 * Versão: 2.0 - Otimizado com cache
 **************************************************************************/

const jwt = require("jsonwebtoken");
const MESSAGE = require("../modulo/config.js");
const usuarioDAO = require("../model/DAO/usuario.js");
const historicoAssinaturaDAO = require("../model/DAO/historicoAssinatura.js");

// Cache simples em memória (dura enquanto Lambda/Vercel está warm)
const assinaturaCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

/**
 * HELPER: Obter data/hora atual no horário de Brasília (UTC-3)
 */
const getDataBrasilia = function () {
  const agora = new Date();
  const dataBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return dataBrasilia;
};

/**
 * MIDDLEWARE: Verificar Token JWT
 */
const verificarToken = async (request, response, next) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return response.status(401).json({
        status: false,
        status_code: 401,
        message: "Token não fornecido. Faça login primeiro.",
      });
    }

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
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key_here";

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
 * MIDDLEWARE: Verificar Assinatura Ativa (com cache)
 */
const verificarAssinatura = async (request, response, next) => {
  try {
    const usuarioId = request.usuarioId;
    const agora = getDataBrasilia();

    // Verificar cache
    const cacheKey = `assinatura_${usuarioId}`;
    const cached = assinaturaCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.valid) {
        request.assinaturaTipo = cached.tipo;
        request.assinaturaValida = cached.validade;
        return next();
      } else {
        return response.status(403).json({
          status: false,
          status_code: 403,
          message:
            "Assinatura expirada ou inativa. Renove sua assinatura para continuar.",
        });
      }
    }

    // Buscar dados do usuário
    const usuario = await usuarioDAO.selectByIdUsuario(usuarioId);

    if (!usuario) {
      return response.status(404).json({
        status: false,
        status_code: 404,
        message: "Usuário não encontrado",
      });
    }

    // Verificar trial_end primeiro (plano_id = 1)
    if (usuario.plano_id === 1 && usuario.trial_end) {
      const trialEnd = new Date(usuario.trial_end);
      if (trialEnd > agora) {
        // Trial ativo - cachear
        assinaturaCache.set(cacheKey, {
          valid: true,
          tipo: "trial",
          validade: usuario.trial_end,
          timestamp: Date.now(),
        });
        request.assinaturaTipo = "trial";
        request.assinaturaValida = usuario.trial_end;
        return next();
      }
    }

    // Verificar assinatura paga via histórico (plano_id != 1)
    if (usuario.plano_id && usuario.plano_id !== 1) {
      const historicos = await historicoAssinaturaDAO.selectHistoricoByUsuario(
        usuarioId
      );

      if (historicos && historicos.length > 0) {
        const ultimoHistorico = historicos[0]; // Já vem ordenado por data DESC

        // Verificar se não foi cancelado e se não expirou
        if (!ultimoHistorico.is_cancelado) {
          const prazo = new Date(ultimoHistorico.prazo);
          if (prazo >= agora) {
            // Assinatura ativa - cachear
            assinaturaCache.set(cacheKey, {
              valid: true,
              tipo: "paga",
              validade: ultimoHistorico.prazo,
              timestamp: Date.now(),
            });
            request.assinaturaTipo = "paga";
            request.assinaturaValida = ultimoHistorico.prazo;
            return next();
          }
        }
      }
    }

    // Nenhuma assinatura ativa - cachear resultado negativo
    assinaturaCache.set(cacheKey, {
      valid: false,
      timestamp: Date.now(),
    });

    return response.status(403).json({
      status: false,
      status_code: 403,
      message:
        "Assinatura expirada ou inativa. Renove sua assinatura para continuar.",
    });
  } catch (error) {
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
