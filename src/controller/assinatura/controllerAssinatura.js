/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de assinaturas
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require("../../modulo/config.js");
const assinaturaDAO = require("../../model/DAO/assinatura.js");
const usuarioDAO = require("../../model/DAO/usuario.js");
const historicoAssinaturaDAO = require("../../model/DAO/historicoAssinatura.js");

/**
 * HELPER: Normalizar texto (remover acentos e converter para minúsculo)
 */
const normalizarTexto = function (texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * HELPER: Mapear nome do plano para plano_id
 * Essencial = 2
 * Inteligente = 3
 * Visionário = 4
 */
const mapearPlanoId = function (nomePlano) {
  const nomeNormalizado = normalizarTexto(nomePlano);

  if (nomeNormalizado.includes("essencial")) return 2;
  if (nomeNormalizado.includes("inteligente")) return 3;
  if (nomeNormalizado.includes("visionario")) return 4;

  return 1; // Plano gratuito por padrão
};

/**
 * CRIAR ASSINATURA
 */
const criarAssinatura = async function (assinatura, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (
      !assinatura.usuarioCodigo ||
      !assinatura.prazo ||
      !assinatura.plano_id_cakto ||
      !assinatura.subscription_id_cakto
    ) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // Verificar se o usuário existe
    const usuario = await usuarioDAO.selectByIdUsuario(
      assinatura.usuarioCodigo,
    );
    if (!usuario) {
      return {
        status: MESSAGE.ERROR_NOT_FOUND.status,
        status_code: MESSAGE.ERROR_NOT_FOUND.status_code,
        message: "Usuário não encontrado",
      };
    }

    const novaAssinatura = await assinaturaDAO.insertAssinatura(assinatura);

    if (novaAssinatura) {
      return {
        status: MESSAGE.SUCCESS_CREATED_ITEM.status,
        status_code: MESSAGE.SUCCESS_CREATED_ITEM.status_code,
        message: MESSAGE.SUCCESS_CREATED_ITEM.message,
        assinatura: novaAssinatura,
      };
    } else {
      return MESSAGE.ERROR_INTERNAL_SERVER_DB;
    }
  } catch (error) {
    console.error("Erro no controller criarAssinatura:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * ATUALIZAR ASSINATURA
 */
const atualizarAssinatura = async function (id, assinatura, contentType) {
  try {
    if (contentType !== "application/json") {
      return MESSAGE.ERROR_CONTENT_TYPE;
    }

    if (!id) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    const assinaturaAtualizada = await assinaturaDAO.updateAssinatura(
      id,
      assinatura,
    );

    if (assinaturaAtualizada) {
      return {
        status: MESSAGE.SUCCESS_UPDATED_ITEM.status,
        status_code: MESSAGE.SUCCESS_UPDATED_ITEM.status_code,
        message: MESSAGE.SUCCESS_UPDATED_ITEM.message,
        assinatura: assinaturaAtualizada,
      };
    } else {
      return MESSAGE.ERROR_NOT_FOUND;
    }
  } catch (error) {
    console.error("Erro no controller atualizarAssinatura:", error);
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
        message: "Assinatura cancelada com sucesso",
        assinatura: assinaturaCancelada,
      };
    } else {
      return MESSAGE.ERROR_NOT_FOUND;
    }
  } catch (error) {
    console.error("Erro no controller cancelarAssinatura:", error);
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
        assinatura: assinatura,
      };
    } else {
      return MESSAGE.ERROR_NOT_FOUND;
    }
  } catch (error) {
    console.error("Erro no controller buscarAssinaturaPorId:", error);
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

    // Buscar assinatura atual
    const assinaturaAtual =
      await assinaturaDAO.selectByUsuarioAssinatura(usuarioCodigo);

    // Buscar histórico de assinaturas
    const historico =
      await historicoAssinaturaDAO.selectHistoricoByUsuario(usuarioCodigo);

    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      assinatura_atual: assinaturaAtual || null,
      historico: historico || [],
    };
  } catch (error) {
    console.error("Erro no controller buscarAssinaturaPorUsuario:", error);
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
      assinaturaAtiva: ativa,
    };
  } catch (error) {
    console.error("Erro no controller verificarAssinaturaAtiva:", error);
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
        assinaturas: assinaturas,
      };
    } else if (assinaturas && assinaturas.length === 0) {
      return MESSAGE.ERROR_NOT_FOUND;
    } else {
      return MESSAGE.ERROR_INTERNAL_SERVER_DB;
    }
  } catch (error) {
    console.error("Erro no controller listarAssinaturas:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * WEBHOOK CAKTO - Processar eventos de assinatura
 */
const webhookCakto = async function (payload) {
  try {
    const event = payload.event;
    const data = payload.data;

    if (!event || !data) {
      return {
        status: false,
        status_code: 400,
        message: "Payload inválido",
      };
    }

    // Formatar telefone com +
    const telefone = "+" + data.customer.phone;

    // Função para obter data/hora de Brasília
    const nowBrasilISO = () => {
      return new Date()
        .toLocaleString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        })
        .replace(" ", "T");
    };

    // 1. Buscar ou criar usuário
    let usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);

    if (!usuario) {
      // Criar usuário
      const novoUsuario = await usuarioDAO.insertUsuario({
        nome: data.customer.name,
        telefone: telefone,
        email: data.customer.email || null,
      });

      if (!novoUsuario) {
        return {
          status: false,
          status_code: 500,
          message: "Erro ao criar usuário",
        };
      }

      usuario = novoUsuario;
    }

    // 2. Processar evento
    switch (event) {
      case "subscription_created":
        return await handleSubscriptionCreated(usuario, data, nowBrasilISO);

      case "subscription_renewed":
        return await handleSubscriptionRenewed(usuario, data, nowBrasilISO);

      case "subscription_canceled":
        return await handleSubscriptionCanceled(usuario, data, nowBrasilISO);

      default:
        return {
          status: false,
          status_code: 400,
          message: `Evento desconhecido: ${event}`,
        };
    }
  } catch (error) {
    console.error("Erro no webhook Cakto:", error);
    return {
      status: false,
      status_code: 500,
      message: "Erro ao processar webhook",
    };
  }
};

/**
 * Handler: subscription_created
 */
async function handleSubscriptionCreated(usuario, data, nowBrasilISO) {
  // Identificar plano_id pelo nome
  const plano_id = mapearPlanoId(data.offer.name);

  // Criar registro no histórico
  const dadosHistorico = {
    usuarioCodigo: usuario.id,
    checkout_id: data.subscription.id,
    nome_assinatura: data.offer.name,
    dataAssinatura: nowBrasilISO(),
    prazo: data.subscription.next_payment_date,
    plano_id_cakto: data.offer.id,
    plano_id: plano_id,
    is_cancelado: false,
  };

  const historico =
    await historicoAssinaturaDAO.insertHistoricoAssinatura(dadosHistorico);

  // Atualizar plano_id do usuário
  await usuarioDAO.updateUsuario(usuario.id, {
    plano_id: plano_id,
    status_plano: data.offer.name,
  });

  return {
    status: true,
    status_code: 201,
    message: "Assinatura criada com sucesso",
    historico: historico,
  };
}

/**
 * Handler: subscription_renewed
 */
async function handleSubscriptionRenewed(usuario, data, nowBrasilISO) {
  // Identificar plano_id pelo nome
  const plano_id = mapearPlanoId(data.offer.name);

  // Criar novo registro no histórico (renovação)
  const dadosHistorico = {
    usuarioCodigo: usuario.id,
    checkout_id: data.subscription.id,
    nome_assinatura: data.offer.name,
    dataAssinatura: nowBrasilISO(),
    prazo: data.subscription.next_payment_date,
    plano_id_cakto: data.offer.id,
    plano_id: plano_id,
    is_cancelado: false,
  };

  const historico =
    await historicoAssinaturaDAO.insertHistoricoAssinatura(dadosHistorico);

  // Atualizar plano_id do usuário
  await usuarioDAO.updateUsuario(usuario.id, {
    plano_id: plano_id,
    status_plano: data.offer.name,
  });

  return {
    status: true,
    status_code: 200,
    message: "Assinatura renovada com sucesso",
    historico: historico,
  };
}

/**
 * Handler: subscription_canceled
 */
async function handleSubscriptionCanceled(usuario, data, nowBrasilISO) {
  // Cancelar apenas o registro específico no histórico (pelo checkout_id)
  const checkout_id = data.subscription.id;
  const historicoCancelado =
    await historicoAssinaturaDAO.cancelarHistoricoAssinatura(
      checkout_id,
      nowBrasilISO(),
    );

  return {
    status: true,
    status_code: 200,
    message: "Assinatura cancelada com sucesso",
    historico: historicoCancelado,
  };
}

module.exports = {
  criarAssinatura,
  atualizarAssinatura,
  cancelarAssinatura,
  buscarAssinaturaPorId,
  buscarAssinaturaPorUsuario,
  verificarAssinaturaAtiva,
  listarAssinaturas,
  webhookCakto,
};
