/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de assinaturas
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require("../../modulo/config.js");
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

  return null; // Retorna null se não identificar o plano
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

    // Buscar histórico de assinaturas
    const historico =
      await historicoAssinaturaDAO.selectHistoricoByUsuario(usuarioCodigo);

    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      assinatura_atual: null, // Deprecated - mantido para compatibilidade
      historico: historico || [],
    };
  } catch (error) {
    console.error("Erro no controller buscarAssinaturaPorUsuario:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * VERIFICAR SE ASSINATURA ESTÁ ATIVA
 * @deprecated - Use historicoAssinatura para validação
 */
const verificarAssinaturaAtiva = async function (usuarioCodigo) {
  try {
    if (!usuarioCodigo) {
      return MESSAGE.ERROR_REQUIRED_FIELDS;
    }

    // Buscar via histórico
    const historicos =
      await historicoAssinaturaDAO.selectHistoricoByUsuario(usuarioCodigo);

    if (historicos && historicos.length > 0) {
      const ultimoHistorico = historicos[0];
      const agora = new Date();
      const prazo = new Date(ultimoHistorico.prazo);
      const ativa = !ultimoHistorico.is_cancelado && prazo >= agora;

      return {
        status: MESSAGE.SUCCESS_REQUEST.status,
        status_code: MESSAGE.SUCCESS_REQUEST.status_code,
        assinaturaAtiva: ativa,
      };
    }

    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      assinaturaAtiva: false,
    };
  } catch (error) {
    console.error("Erro no controller verificarAssinaturaAtiva:", error);
    return MESSAGE.ERROR_INTERNAL_SERVER;
  }
};

/**
 * LISTAR TODAS AS ASSINATURAS
 * @deprecated - Agora usamos apenas historico_assinaturas
 */
const listarAssinaturas = async function () {
  try {
    return {
      status: false,
      status_code: 410,
      message: "Esta função foi descontinuada. Use o histórico de assinaturas.",
    };
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
    console.log("\n========== WEBHOOK CAKTO - INÍCIO ==========");
    console.log("📦 Payload recebido:", JSON.stringify(payload, null, 2));

    const event = payload.event;
    const data = payload.data;

    console.log("🔍 Evento:", event);
    console.log("📋 Dados do cliente:", {
      nome: data?.customer?.name,
      telefone: data?.customer?.phone,
      email: data?.customer?.email,
    });
    console.log("💳 Dados da oferta:", {
      id: data?.offer?.id,
      nome: data?.offer?.name,
    });
    console.log("📝 Dados da subscription:", {
      id: data?.subscription?.id,
      next_payment_date: data?.subscription?.next_payment_date,
    });

    if (!event || !data) {
      console.error("❌ Payload inválido - event ou data ausente");
      return {
        status: false,
        status_code: 400,
        message: "Payload inválido",
      };
    }

    // Formatar telefone com +
    const telefone = "+" + data.customer.phone;
    console.log("📞 Telefone formatado:", telefone);

    // Função para obter data/hora de Brasília
    const nowBrasilISO = () => {
      return new Date()
        .toLocaleString("sv-SE", {
          timeZone: "America/Sao_Paulo",
        })
        .replace(" ", "T");
    };

    // 1. Buscar ou criar usuário
    console.log("🔍 Buscando usuário pelo telefone:", telefone);
    let usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);

    if (!usuario) {
      console.log("👤 Usuário não encontrado. Criando novo usuário...");
      // Criar usuário
      const novoUsuario = await usuarioDAO.insertUsuario({
        nome: data.customer.name,
        telefone: telefone,
        email: data.customer.email || null,
      });

      if (!novoUsuario) {
        console.error("❌ Erro ao criar usuário");
        return {
          status: false,
          status_code: 500,
          message: "Erro ao criar usuário",
        };
      }

      usuario = novoUsuario;
      console.log("✅ Usuário criado com sucesso:", {
        id: usuario.id,
        nome: usuario.nome,
        telefone: usuario.telefone,
      });
    } else {
      console.log("✅ Usuário encontrado:", {
        id: usuario.id,
        nome: usuario.nome,
        telefone: usuario.telefone,
        plano_id: usuario.plano_id,
      });
    }

    // 2. Processar evento
    console.log("🔄 Processando evento:", event);
    switch (event) {
      case "subscription_created":
        return await handleSubscriptionCreated(usuario, data, nowBrasilISO);

      case "subscription_renewed":
        return await handleSubscriptionRenewed(usuario, data, nowBrasilISO);

      case "subscription_canceled":
        return await handleSubscriptionCanceled(usuario, data, nowBrasilISO);

      default:
        console.error("❌ Evento desconhecido:", event);
        return {
          status: false,
          status_code: 400,
          message: `Evento desconhecido: ${event}`,
        };
    }
  } catch (error) {
    console.error("❌ Erro no webhook Cakto:", error);
    console.error("Stack trace:", error.stack);
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
  console.log("\n✨ === SUBSCRIPTION_CREATED ===");
  console.log("👤 Usuário ID:", usuario.id);
  console.log("🎯 Nome da oferta:", data.offer.name);

  // Identificar plano_id pelo nome
  const plano_id = mapearPlanoId(data.offer.name);
  console.log("📊 Plano ID mapeado:", plano_id);

  // Validar se o plano foi identificado
  if (!plano_id) {
    console.error("❌ Plano não identificado. Nome recebido:", data.offer.name);
    return {
      status: false,
      status_code: 400,
      message: `Plano não identificado: ${data.offer.name}. Planos válidos: Essencial, Inteligente, Visionário`,
    };
  }

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

  console.log("📝 Dados do histórico a inserir:", dadosHistorico);

  const historico =
    await historicoAssinaturaDAO.insertHistoricoAssinatura(dadosHistorico);

  if (historico) {
    console.log("✅ Histórico criado:", {
      id: historico.id,
      checkout_id: historico.checkout_id,
      plano_id: historico.plano_id,
    });
  } else {
    console.error("❌ Erro ao criar histórico");
  }

  // Atualizar plano_id do usuário
  console.log("🔄 Atualizando plano do usuário...");
  const usuarioAtualizado = await usuarioDAO.updateUsuario(usuario.id, {
    plano_id: plano_id,
    status_plano: data.offer.name,
  });

  if (usuarioAtualizado) {
    console.log("✅ Usuário atualizado:", {
      id: usuarioAtualizado.id,
      plano_id: usuarioAtualizado.plano_id,
      status_plano: usuarioAtualizado.status_plano,
    });
  } else {
    console.error("❌ Erro ao atualizar usuário");
  }

  console.log("✅ SUBSCRIPTION_CREATED finalizado com sucesso\n");
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
  console.log("\n🔄 === SUBSCRIPTION_RENEWED ===");
  console.log("👤 Usuário ID:", usuario.id);
  console.log("🎯 Nome da oferta:", data.offer.name);

  // Identificar plano_id pelo nome
  const plano_id = mapearPlanoId(data.offer.name);
  console.log("📊 Plano ID mapeado:", plano_id);

  // Validar se o plano foi identificado
  if (!plano_id) {
    console.error("❌ Plano não identificado. Nome recebido:", data.offer.name);
    return {
      status: false,
      status_code: 400,
      message: `Plano não identificado: ${data.offer.name}. Planos válidos: Essencial, Inteligente, Visionário`,
    };
  }

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

  console.log("📝 Dados do histórico a inserir:", dadosHistorico);

  const historico =
    await historicoAssinaturaDAO.insertHistoricoAssinatura(dadosHistorico);

  if (historico) {
    console.log("✅ Histórico de renovação criado:", {
      id: historico.id,
      checkout_id: historico.checkout_id,
      plano_id: historico.plano_id,
    });
  } else {
    console.error("❌ Erro ao criar histórico de renovação");
  }

  // Atualizar plano_id do usuário
  console.log("🔄 Atualizando plano do usuário...");
  const usuarioAtualizado = await usuarioDAO.updateUsuario(usuario.id, {
    plano_id: plano_id,
    status_plano: data.offer.name,
  });

  if (usuarioAtualizado) {
    console.log("✅ Usuário atualizado:", {
      id: usuarioAtualizado.id,
      plano_id: usuarioAtualizado.plano_id,
      status_plano: usuarioAtualizado.status_plano,
    });
  } else {
    console.error("❌ Erro ao atualizar usuário");
  }

  console.log("✅ SUBSCRIPTION_RENEWED finalizado com sucesso\n");
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
  console.log("\n❌ === SUBSCRIPTION_CANCELED ===");
  console.log("👤 Usuário ID:", usuario.id);
  console.log("🔑 Checkout ID:", data.subscription.id);

  // Cancelar apenas o registro específico no histórico (pelo checkout_id)
  const checkout_id = data.subscription.id;
  console.log("🔄 Cancelando histórico com checkout_id:", checkout_id);

  const historicoCancelado =
    await historicoAssinaturaDAO.cancelarHistoricoAssinatura(
      checkout_id,
      nowBrasilISO(),
    );

  if (historicoCancelado) {
    console.log("✅ Histórico cancelado:", {
      id: historicoCancelado.id,
      checkout_id: historicoCancelado.checkout_id,
      is_cancelado: historicoCancelado.is_cancelado,
      dataCancelamento: historicoCancelado.datacancelamento,
    });
  } else {
    console.error("❌ Erro ao cancelar histórico ou histórico não encontrado");
  }

  console.log("✅ SUBSCRIPTION_CANCELED finalizado\n");
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
