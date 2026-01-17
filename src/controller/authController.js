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
const historicoAssinaturaDAO = require("../model/DAO/historicoAssinatura.js");

/**
 * HELPER: Obter data/hora atual no horário de Brasília (UTC-3)
 */
const getDataBrasilia = function () {
  const agora = new Date();
  // Brasília está 3 horas ATRÁS de UTC (UTC-3)
  // Então precisamos SUBTRAIR 3 horas do horário UTC
  const dataBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
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
      dados.is_segundaValidacao || false,
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
      dados.codigo,
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

    // Verificar assinatura baseado no plano_id (usando horário de Brasília)
    const agora = getDataBrasilia();

    if (usuario.plano_id === 1) {
      // Plano teste/gratuito - validar trial_end
      if (usuario.trial_end) {
        const trialEnd = new Date(usuario.trial_end);
        if (trialEnd > agora) {
          return {
            status: MESSAGE.SUCCESS_REQUEST.status,
            status_code: MESSAGE.SUCCESS_REQUEST.status_code,
            message: "Período de trial ativo",
            assinaturaAtiva: true,
            tipo: "trial",
            validade: usuario.trial_end,
            plano: "Plano Gratuito",
          };
        }
      }

      // Trial expirado
      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Período de trial expirado",
        assinaturaAtiva: false,
      };
    } else {
      // Plano pago - buscar último histórico de assinatura
      const historicos = await historicoAssinaturaDAO.selectHistoricoByUsuario(
        usuario.id,
      );

      if (historicos && historicos.length > 0) {
        const ultimoHistorico = historicos[0]; // Já vem ordenado por data DESC

        // Verificar se não foi cancelado e se não expirou
        if (!ultimoHistorico.is_cancelado) {
          const prazo = new Date(ultimoHistorico.prazo);
          if (prazo >= agora) {
            return {
              status: MESSAGE.SUCCESS_REQUEST.status,
              status_code: MESSAGE.SUCCESS_REQUEST.status_code,
              message: "Assinatura ativa",
              assinaturaAtiva: true,
              tipo: "paga",
              validade: ultimoHistorico.prazo,
              plano: ultimoHistorico.nome_assinatura,
              historico: ultimoHistorico,
            };
          }
        }
      }

      // Assinatura cancelada ou expirada
      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        message: "Assinatura inativa ou expirada",
        assinaturaAtiva: false,
      };
    }
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
      dados.codigo,
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

    // 3. Verificar assinatura baseado no plano_id (usando horário de Brasília)
    let assinaturaAtiva = false;
    let assinaturaTipo = null;
    let assinaturaValidade = null;
    let planoNome = null;

    const agora = getDataBrasilia();

    console.log("🔍 [LOGIN] Validando assinatura...");
    console.log("🔍 [LOGIN] Usuario plano_id:", usuario.plano_id);
    console.log("🔍 [LOGIN] Data atual (Brasília):", agora);

    if (usuario.plano_id === 1) {
      // Plano teste/gratuito - validar trial_end
      console.log("📋 [LOGIN] Validando plano gratuito/trial");
      console.log("📋 [LOGIN] Trial end:", usuario.trial_end);

      if (usuario.trial_end) {
        const trialEnd = new Date(usuario.trial_end);
        console.log("📋 [LOGIN] Trial end (Date):", trialEnd);
        console.log("📋 [LOGIN] Trial ativo?", trialEnd > agora);

        if (trialEnd > agora) {
          assinaturaAtiva = true;
          assinaturaTipo = "trial";
          assinaturaValidade = usuario.trial_end;
          planoNome = "Plano Gratuito";
        }
      }
    } else {
      // Plano pago - buscar último histórico de assinatura
      console.log("💳 [LOGIN] Validando plano pago - buscando histórico...");

      const historicos = await historicoAssinaturaDAO.selectHistoricoByUsuario(
        usuario.id,
      );

      console.log(
        "💳 [LOGIN] Históricos encontrados:",
        historicos?.length || 0,
      );

      if (historicos && historicos.length > 0) {
        const ultimoHistorico = historicos[0]; // Já vem ordenado por data DESC

        console.log("💳 [LOGIN] Último histórico:", {
          id: ultimoHistorico.id,
          nome_assinatura: ultimoHistorico.nome_assinatura,
          is_cancelado: ultimoHistorico.is_cancelado,
          prazo: ultimoHistorico.prazo,
          plano_id: ultimoHistorico.plano_id,
        });

        // Verificar se não foi cancelado e se não expirou
        console.log("💳 [LOGIN] Cancelado?", ultimoHistorico.is_cancelado);

        if (!ultimoHistorico.is_cancelado) {
          const prazo = new Date(ultimoHistorico.prazo);
          console.log("💳 [LOGIN] Prazo:", prazo);
          console.log("💳 [LOGIN] Prazo >= agora?", prazo >= agora);

          if (prazo >= agora) {
            assinaturaAtiva = true;
            assinaturaTipo = "paga";
            assinaturaValidade = ultimoHistorico.prazo;
            planoNome = ultimoHistorico.nome_assinatura;
          } else {
            console.log("⚠️ [LOGIN] Assinatura expirada!");
          }
        } else {
          console.log("⚠️ [LOGIN] Assinatura cancelada!");
        }
      } else {
        console.log("⚠️ [LOGIN] Nenhum histórico encontrado!");
      }
    }

    console.log("✅ [LOGIN] Resultado validação:", {
      ativa: assinaturaAtiva,
      tipo: assinaturaTipo,
      validade: assinaturaValidade,
      plano: planoNome,
    });

    // 4. Gerar JWT Token
    const tokenPayload = {
      id: usuario.id,
      telefone: usuario.telefone,
      nome: usuario.nome,
      email: usuario.email,
    };

    // JWT Secret fixo
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key_here";
    const jwtExpires = process.env.JWT_EXPIRES_IN || "1h";

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
        plano: planoNome,
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
