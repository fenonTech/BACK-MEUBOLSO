/**************************************************************************
 * Objetivo: Controller responsável pela lógica de negócio de assinaturas
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

const MESSAGE = require("../../modulo/config.js");
const usuarioDAO = require("../../model/DAO/usuario.js");
const assinaturaDAO = require("../../model/DAO/assinatura.js");
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
 * HELPER: Mapear nome do plano para plano_id e estrutura de mensagem
 * Essencial = 2
 * Inteligente = 3
 * Visionário = 4
 */
const mapearPlanoId = function (nomePlano, telefoneUsuario = null) {
  const nomeNormalizado = normalizarTexto(nomePlano);

  const estruturaBase = {
    phone: telefoneUsuario,
    message: "",
    carousel: [],
  };

  if (nomeNormalizado.includes("essencial")) {
    return {
      plano_id: 2,
      ...estruturaBase,
      message:
        "🎉 Parabéns! Sua assinatura do Plano Essencial foi ativada com sucesso! Agora você tem acesso aos recursos básicos do MeuBolso.",
      carousel: [
        {
          text: "Seja bem vindo!",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/planoessencial.png",
        },
        {
          text: "Como registar gastos?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/gastos.png",
        },
      ],
    };
  }

  if (nomeNormalizado.includes("inteligente") || nomeNormalizado.includes("intermediaria")) {
    return {
      plano_id: 3,
      ...estruturaBase,
      message:
        "🚀 Excelente escolha! Sua assinatura do Plano Inteligente foi ativada! Você agora tem acesso a recursos avançados de controle financeiro.",
      carousel: [
        {
          text: "Bem vindoo!",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/planointeligente.png",
        },
        {
          text: "Como registar gastos?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/gastos.png",
        },
        {
          text: "Como consultar relatórios?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/relatorio.png",
        },
        {
          text: "Como funciona os lembretes?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/lembretes.png",
        },
      ],
    };
  }

  if (nomeNormalizado.includes("visionario") || nomeNormalizado.includes("premium")) {
    return {
      plano_id: 4,
      ...estruturaBase,
      message:
        "👑 Incrível! Sua assinatura do Plano Visionário foi ativada! Você agora tem acesso completo a todos os recursos premium do MeuBolso.",
      carousel: [
        {
          text: "Bem vindo!",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/planovisionario.png",
        },
        {
          text: "Como registar gastos?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/gastos.png",
        },
        {
          text: "Como consultar relatórios?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/relatorio.png",
        },
        {
          text: "Como funciona os lembretes?",
          image:
            "https://fenon-meubolso.s3.us-east-1.amazonaws.com/fotos/lembretes.png",
        },
      ],
    };
  }

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
    const todasAssinaturas =
      await historicoAssinaturaDAO.selectHistoricoByUsuario(usuarioCodigo);

    // A assinatura atual é sempre a última (mais recente) assinatura
    const assinaturaAtual =
      todasAssinaturas && todasAssinaturas.length > 0
        ? todasAssinaturas[0]
        : null;

    // O histórico contém todas as assinaturas exceto a atual
    const historico =
      todasAssinaturas && todasAssinaturas.length > 1
        ? todasAssinaturas.slice(1)
        : [];

    return {
      status: MESSAGE.SUCCESS_REQUEST.status,
      status_code: MESSAGE.SUCCESS_REQUEST.status_code,
      assinatura_atual: assinaturaAtual,
      historico: historico,
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

  // Identificar plano_id e estrutura de mensagem pelo nome
  const telefone = "+" + data.customer.phone;
  const planoInfo = mapearPlanoId(data.offer.name, telefone);
  console.log("📊 Plano mapeado:", planoInfo);

  // Validar se o plano foi identificado
  if (!planoInfo) {
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
    plano_id: planoInfo.plano_id,
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
    plano_id: planoInfo.plano_id,
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

  // 7. Chamar webhook n8n para enviar carrossel
  try {
    const webhookUrl =
      "https://n8n.srv1056458.hstgr.cloud/webhook/enviarCarrosel";

    console.log("📞 [SUBSCRIPTION_CREATED] Chamando webhook n8n...");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(planoInfo),
    });

    if (response.ok) {
      console.log(
        "✅ [SUBSCRIPTION_CREATED] Webhook carrossel enviado com sucesso",
      );
    } else {
      console.error(
        "⚠️ [SUBSCRIPTION_CREATED] Webhook retornou erro:",
        response.status,
      );
    }
  } catch (webhookError) {
    console.error(
      "⚠️ [SUBSCRIPTION_CREATED] Erro ao chamar webhook:",
      webhookError,
    );
  }

  console.log("✅ SUBSCRIPTION_CREATED finalizado com sucesso\n");
  return {
    status: true,
    status_code: 201,
    message: "Assinatura criada com sucesso",
    historico: historico,
    mensagem_usuario: planoInfo,
  };
}

/**
 * Handler: subscription_renewed
 */
async function handleSubscriptionRenewed(usuario, data, nowBrasilISO) {
  console.log("\n🔄 === SUBSCRIPTION_RENEWED ===");
  console.log("👤 Usuário ID:", usuario.id);
  console.log("🎯 Nome da oferta:", data.offer.name);

  // Identificar plano_id e estrutura de mensagem pelo nome
  const telefone = "+" + data.customer.phone;
  const planoInfo = mapearPlanoId(data.offer.name, telefone);
  console.log("📊 Plano mapeado:", planoInfo);

  // Validar se o plano foi identificado
  if (!planoInfo) {
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
    plano_id: planoInfo.plano_id,
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
    plano_id: planoInfo.plano_id,
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

  // 7. Chamar webhook n8n para enviar carrossel
  try {
    const webhookUrl =
      "https://n8n.srv1056458.hstgr.cloud/webhook/enviarCarrosel";

    console.log("📞 [SUBSCRIPTION_RENEWED] Chamando webhook n8n...");

    // Personalizar mensagem para renovação
    const mensagemRenovacao = { ...planoInfo };
    if (mensagemRenovacao.message.includes("ativada")) {
      mensagemRenovacao.message = mensagemRenovacao.message.replace(
        "foi ativada",
        "foi renovada",
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mensagemRenovacao),
    });

    if (response.ok) {
      console.log(
        "✅ [SUBSCRIPTION_RENEWED] Webhook carrossel enviado com sucesso",
      );
    } else {
      console.error(
        "⚠️ [SUBSCRIPTION_RENEWED] Webhook retornou erro:",
        response.status,
      );
    }
  } catch (webhookError) {
    console.error(
      "⚠️ [SUBSCRIPTION_RENEWED] Erro ao chamar webhook:",
      webhookError,
    );
  }

  console.log("✅ SUBSCRIPTION_RENEWED finalizado com sucesso\n");
  return {
    status: true,
    status_code: 200,
    message: "Assinatura renovada com sucesso",
    historico: historico,
    mensagem_usuario: planoInfo,
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

/**
 * ATIVAR ASSINATURA VIA ABACATE PAY
 * Chamado pelo controllerPagamento quando o status do pagamento é PAID.
 * Reutiliza toda a lógica de mapearPlanoId, histórico, atualização de usuário e webhook n8n.
 */
const ativarAssinaturaAbacatePay = async function ({
  tipo,       // "PIX" | "CARD"
  checkoutId, // ID do pagamento retornado pela Abacate Pay
  nomeProduto,
  email,
  telefone,
  prazo,
  status,
}) {
  try {
    if (status !== "PAID") {
      return {
        status: false,
        message: "Pagamento ainda não está aprovado (status diferente de PAID).",
      };
    }

    const nowBrasilISO = () =>
      new Date()
        .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
        .replace(" ", "T");

    // 1. Buscar usuário por email ou telefone
    let usuario = null;
    if (email) usuario = await usuarioDAO.selectByEmailUsuario(email);
    if (!usuario && telefone) usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);

    if (!usuario?.id) {
      return {
        status: false,
        message: "Pagamento aprovado, mas usuário não encontrado para vinculação.",
      };
    }

    // 2. Mapear plano pelo nome do produto
    const telefoneUsuario = telefone || usuario.telefone;
    const planoInfo = mapearPlanoId(nomeProduto || "", telefoneUsuario);

    if (!planoInfo) {
      return {
        status: false,
        message: `Plano não identificado: "${nomeProduto}". Planos válidos: Essencial, Inteligente/Intermediário, Visionário/Premium.`,
      };
    }

    // 3. Criar histórico (evita duplicatas pelo checkout_id)
    const historicoExistente = await historicoAssinaturaDAO.selectHistoricoByCheckoutId(checkoutId);
    let historico = historicoExistente;

    if (!historicoExistente) {
      historico = await historicoAssinaturaDAO.insertHistoricoAssinatura({
        usuarioCodigo: usuario.id,
        checkout_id: checkoutId,
        nome_assinatura: nomeProduto,
        dataAssinatura: nowBrasilISO(),
        prazo: prazo || nowBrasilISO(),
        plano_id_cakto: `abacatepay_${tipo.toLowerCase()}`,
        plano_id: planoInfo.plano_id,
        is_cancelado: false,
      });
      console.log("✅ [ABACATEPAY] Histórico criado:", historico?.id);
    } else {
      console.log("ℹ️ [ABACATEPAY] Histórico já existente para checkout_id:", checkoutId);
    }

    // 4. Atualizar plano do usuário
    const usuarioAtualizado = await usuarioDAO.updateUsuario(usuario.id, {
      plano_id: planoInfo.plano_id,
      status_plano: nomeProduto,
    });
    console.log("✅ [ABACATEPAY] Usuário atualizado - plano_id:", planoInfo.plano_id);

    // 5. Disparar webhook n8n (carrossel de boas-vindas)
    try {
      const response = await fetch("https://n8n.srv1056458.hstgr.cloud/webhook/enviarCarrosel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planoInfo, phone: telefoneUsuario }),
      });
      if (response.ok) {
        console.log("✅ [ABACATEPAY] Webhook carrossel enviado com sucesso");
      } else {
        console.error("⚠️ [ABACATEPAY] Webhook retornou erro:", response.status);
      }
    } catch (webhookError) {
      console.error("⚠️ [ABACATEPAY] Erro ao chamar webhook n8n:", webhookError);
    }

    return {
      status: true,
      message: "Assinatura ativada com sucesso via Abacate Pay.",
      usuario_id: usuario.id,
      plano_id: planoInfo.plano_id,
      historico_id: historico?.id || null,
      usuario_atualizado: Boolean(usuarioAtualizado),
    };
  } catch (error) {
    console.error("❌ Erro em ativarAssinaturaAbacatePay:", error);
    return {
      status: false,
      message: "Erro interno ao ativar assinatura.",
    };
  }
};

/**
 * WEBHOOK ABACATEPAY - Processar eventos de assinatura recorrente com cartão
 *
 * Eventos tratados:
 *  - subscription.subscribed → nova assinatura paga (ativa o plano)
 *  - subscription.renewed    → renovação mensal paga (atualiza prazo)
 *  - subscription.canceled   → assinatura cancelada
 *
 * Payload esperado do AbacatePay:
 * {
 *   event: "subscription.subscribed" | "subscription.renewed" | "subscription.canceled",
 *   data: {
 *     subscription: { id, status, nextBillingDate },
 *     plan: { id, name, amount, interval },
 *     customer: { name, email, cellphone, taxId }
 *   }
 * }
 */
const webhookAbacatePay = async function (payload) {
  try {
    console.log("\n========== WEBHOOK ABACATEPAY - INÍCIO ==========");
    console.log("📦 Payload recebido:", JSON.stringify(payload, null, 2));

    const { event, data } = payload || {};

    if (!event || !data) {
      console.error("❌ Payload inválido - event ou data ausente");
      return { status: false, status_code: 400, message: "Payload inválido" };
    }

    console.log("🔍 Evento:", event);

    const nowBrasilISO = () =>
      new Date()
        .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
        .replace(" ", "T");

    switch (event) {
      case "subscription.subscribed":
        return await handleAbacateSubscribed(data, nowBrasilISO);

      case "subscription.renewed":
        return await handleAbacateRenewed(data, nowBrasilISO);

      case "subscription.canceled":
        return await handleAbacateCanceled(data, nowBrasilISO);

      default:
        console.log("ℹ️ [ABACATEPAY WEBHOOK] Evento ignorado:", event);
        return {
          status: true,
          status_code: 200,
          message: `Evento "${event}" recebido e ignorado`,
        };
    }
  } catch (error) {
    console.error("❌ Erro no webhook AbacatePay:", error);
    console.error("Stack trace:", error.stack);
    return { status: false, status_code: 500, message: "Erro ao processar webhook" };
  }
};

/**
 * Handler: subscription.subscribed — primeira cobrança paga, ativa assinatura
 */
async function handleAbacateSubscribed(data, nowBrasilISO) {
  console.log("\n✨ === SUBSCRIPTION.SUBSCRIBED ===");

  const subscription = data?.subscription || {};
  const plan = data?.plan || {};
  const customer = data?.customer || {};

  const checkoutId = subscription.id;
  const nomeProduto = plan.name;
  const email = customer.email;
  const telefone = customer.cellphone
    ? customer.cellphone.startsWith("+") ? customer.cellphone : `+${customer.cellphone}`
    : null;
  const prazo = subscription.nextBillingDate || null;

  console.log("📋 Dados:", { checkoutId, nomeProduto, email, telefone, prazo });

  // Reutiliza a lógica centralizada de ativarAssinaturaAbacatePay
  const resultado = await ativarAssinaturaAbacatePay({
    tipo: "SUBSCRIPTION",
    checkoutId,
    status: "PAID",
    nomeProduto,
    email,
    telefone,
    prazo,
  });

  console.log("✅ SUBSCRIPTION.SUBSCRIBED finalizado\n");
  return {
    ...resultado,
    status_code: resultado.status ? 201 : 422,
    message: resultado.status
      ? "Assinatura ativada com sucesso via AbacatePay"
      : resultado.message,
  };
}

/**
 * Handler: subscription.renewed — renovação automática paga, atualiza prazo
 */
async function handleAbacateRenewed(data, nowBrasilISO) {
  console.log("\n🔄 === SUBSCRIPTION.RENEWED ===");

  const subscription = data?.subscription || {};
  const plan = data?.plan || {};
  const customer = data?.customer || {};

  const checkoutId = subscription.id;
  const nomeProduto = plan.name;
  const email = customer.email;
  const telefone = customer.cellphone
    ? customer.cellphone.startsWith("+") ? customer.cellphone : `+${customer.cellphone}`
    : null;
  const prazo = subscription.nextBillingDate || null;

  console.log("📋 Dados:", { checkoutId, nomeProduto, email, telefone, prazo });

  // Buscar usuário
  let usuario = null;
  if (email) usuario = await usuarioDAO.selectByEmailUsuario(email);
  if (!usuario && telefone) usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);

  if (!usuario?.id) {
    return { status: false, status_code: 422, message: "Usuário não encontrado para renovação." };
  }

  const planoInfo = mapearPlanoId(nomeProduto || "", telefone || usuario.telefone);
  if (!planoInfo) {
    return {
      status: false,
      status_code: 400,
      message: `Plano não identificado: "${nomeProduto}".`,
    };
  }

  // Inserir novo registro de histórico para a renovação
  const historico = await historicoAssinaturaDAO.insertHistoricoAssinatura({
    usuarioCodigo: usuario.id,
    checkout_id: `${checkoutId}_renewal_${Date.now()}`,
    nome_assinatura: nomeProduto,
    dataAssinatura: nowBrasilISO(),
    prazo: prazo || nowBrasilISO(),
    plano_id_cakto: `abacatepay_subscription_renewed`,
    plano_id: planoInfo.plano_id,
    is_cancelado: false,
  });

  // Garantir que plano_id e status_plano do usuário continuam corretos
  await usuarioDAO.updateUsuario(usuario.id, {
    plano_id: planoInfo.plano_id,
    status_plano: nomeProduto,
  });

  // Webhook n8n — mensagem de renovação
  try {
    const mensagemRenovacao = {
      ...planoInfo,
      phone: telefone || usuario.telefone,
      message: planoInfo.message.includes("foi ativada")
        ? planoInfo.message.replace("foi ativada", "foi renovada")
        : planoInfo.message,
    };
    await fetch("https://n8n.srv1056458.hstgr.cloud/webhook/enviarCarrosel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensagemRenovacao),
    });
    console.log("✅ [ABACATEPAY RENEWED] Webhook carrossel enviado");
  } catch (webhookError) {
    console.error("⚠️ [ABACATEPAY RENEWED] Erro ao chamar webhook n8n:", webhookError);
  }

  console.log("✅ SUBSCRIPTION.RENEWED finalizado\n");
  return {
    status: true,
    status_code: 200,
    message: "Assinatura renovada com sucesso via AbacatePay",
    historico_id: historico?.id || null,
    usuario_id: usuario.id,
    plano_id: planoInfo.plano_id,
  };
}

/**
 * Handler: subscription.canceled — cancela o histórico da assinatura
 */
async function handleAbacateCanceled(data, nowBrasilISO) {
  console.log("\n❌ === SUBSCRIPTION.CANCELED ===");

  const subscription = data?.subscription || {};
  const checkoutId = subscription.id;

  console.log("🔑 Subscription ID:", checkoutId);

  if (!checkoutId) {
    return { status: false, status_code: 400, message: "subscription.id ausente no payload." };
  }

  // Tenta cancelar pelo checkout_id exato
  const historicoCancelado = await historicoAssinaturaDAO.cancelarHistoricoAssinatura(
    checkoutId,
    nowBrasilISO(),
  );

  if (!historicoCancelado) {
    console.error("⚠️ Histórico não encontrado para checkout_id:", checkoutId);
    return {
      status: false,
      status_code: 404,
      message: "Assinatura não encontrada para cancelamento.",
    };
  }

  console.log("✅ SUBSCRIPTION.CANCELED finalizado\n");
  return {
    status: true,
    status_code: 200,
    message: "Assinatura cancelada com sucesso via AbacatePay",
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
  webhookAbacatePay,
  mapearPlanoId,
  ativarAssinaturaAbacatePay,
};
