/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const axios = require("axios");
const usuarioDAO = require("../../model/DAO/usuario.js");
const historicoAssinaturaDAO = require("../../model/DAO/historicoAssinatura.js");

const ABACATEPAY_BASE_URL =
  process.env.ABACATEPAY_BASE_URL || "https://api.abacatepay.com/v1";

const onlyDefined = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const getApiKey = (isTeste = false) =>
  isTeste ? process.env.ABACATEPAY_API_KEY_TEST : process.env.ABACATEPAY_API_KEY;

const getCommonHeaders = (isTeste = false) => ({
  Authorization: `Bearer ${getApiKey(isTeste)}`,
  "Content-Type": "application/json",
});

const validateBaseInput = (contentType, isTeste = false) => {
  if (!String(contentType || "").includes("application/json")) {
    return {
      status: false,
      status_code: 415,
      message: "Content-Type deve ser application/json",
    };
  }

  if (!getApiKey(isTeste)) {
    return {
      status: false,
      status_code: 500,
      message: isTeste
        ? "ABACATEPAY_API_KEY_TEST não configurada."
        : "ABACATEPAY_API_KEY não configurada.",
    };
  }

  return null;
};

const extractErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  return (
    data?.error ||
    data?.message ||
    data?.details ||
    (Array.isArray(data?.errors)
      ? data.errors.map((e) => e?.message || e).join("; ")
      : null) ||
    error?.message ||
    "Erro ao criar pagamento na Abacate Pay"
  );
};

const handleProviderError = (error, endpointPath) => ({
  status: false,
  status_code: error.response?.status || 500,
  message: extractErrorMessage(error),
  erro: {
    provider_status: error.response?.status || null,
    provider_data: error.response?.data || null,
    request_url: `${ABACATEPAY_BASE_URL}${endpointPath}`,
  },
});

const mapearPlanoId = (nomeProduto = "") => {
  const nome = String(nomeProduto).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (nome.includes("essencial")) return { plano_id: 2, status_plano: "Plano Essencial" };
  if (nome.includes("inteligente")) return { plano_id: 3, status_plano: "Plano Inteligente" };
  if (nome.includes("visionario") || nome.includes("visionário"))
    return { plano_id: 4, status_plano: "Plano Visionário" };

  return null;
};

const registrarPagamentoAprovado = async ({
  tipo,
  providerId,
  status,
  amount,
  nomeProduto,
  email,
  telefone,
  prazo,
}) => {
  if (status !== "PAID") {
    return {
      status: false,
      message: "Pagamento ainda não está aprovado (status diferente de PAID).",
    };
  }

  let usuario = null;

  if (email) {
    usuario = await usuarioDAO.selectByEmailUsuario(email);
  }

  if (!usuario && telefone) {
    usuario = await usuarioDAO.selectByTelefoneUsuario(telefone);
  }

  if (!usuario?.id) {
    return {
      status: false,
      message: "Pagamento aprovado, mas usuário não encontrado para vinculação.",
    };
  }

  const checkoutId = providerId;
  const historicoExistente = await historicoAssinaturaDAO.selectHistoricoByCheckoutId(
    checkoutId,
  );

  let historico = historicoExistente;

  if (!historicoExistente) {
    historico = await historicoAssinaturaDAO.insertHistoricoAssinatura({
      usuarioCodigo: usuario.id,
      checkout_id: checkoutId,
      nome_assinatura: nomeProduto || `Pagamento ${tipo}`,
      dataAssinatura: new Date().toISOString(),
      prazo: prazo || new Date().toISOString(),
      plano_id_cakto: `abacatepay_${tipo.toLowerCase()}`,
      plano_id: usuario.plano_id || 1,
      is_cancelado: false,
    });
  }

  const plano = mapearPlanoId(nomeProduto);
  let usuarioAtualizado = null;

  if (plano) {
    usuarioAtualizado = await usuarioDAO.updateUsuario(usuario.id, {
      plano_id: plano.plano_id,
      status_plano: plano.status_plano,
    });
  } else {
    usuarioAtualizado = await usuarioDAO.updateUsuario(usuario.id, {
      status_plano: `Pagamento ${tipo} aprovado (${amount || 0} centavos)`,
    });
  }

  return {
    status: true,
    message: "Pagamento aprovado e vinculado ao usuário com sucesso.",
    usuario_id: usuario.id,
    historico_id: historico?.id || null,
    usuario_atualizado: Boolean(usuarioAtualizado),
  };
};

const validatePixInput = (dadosPagamento) => {
  const amount = Number(dadosPagamento?.amount || dadosPagamento?.valor_centavos);

  if (Number.isNaN(amount) || amount <= 0) {
    return {
      status: false,
      status_code: 400,
      message: "amount (ou valor_centavos) deve ser um número maior que zero.",
    };
  }

  const customerFields = {
    name: dadosPagamento?.name || dadosPagamento?.nome,
    cellphone: dadosPagamento?.cellphone || dadosPagamento?.celular,
    email: dadosPagamento?.email,
    taxId: dadosPagamento?.taxId || dadosPagamento?.cpf_cnpj,
  };

  const anyCustomerField = Object.values(customerFields).some(Boolean);
  const allCustomerField = Object.values(customerFields).every(Boolean);

  if (anyCustomerField && !allCustomerField) {
    return {
      status: false,
      status_code: 400,
      message:
        "Se enviar customer, informe name, cellphone, email e taxId (ou aliases).",
    };
  }

  return null;
};

const createPixPayload = (dadosPagamento) => {
  const customer = onlyDefined({
    name: dadosPagamento?.name || dadosPagamento?.nome,
    cellphone: dadosPagamento?.cellphone || dadosPagamento?.celular,
    email: dadosPagamento?.email,
    taxId: dadosPagamento?.taxId || dadosPagamento?.cpf_cnpj,
  });

  return onlyDefined({
    amount: Number(dadosPagamento?.amount || dadosPagamento?.valor_centavos),
    expiresIn: dadosPagamento?.expiresIn
      ? Number(dadosPagamento.expiresIn)
      : undefined,
    description: (dadosPagamento?.description ||
      dadosPagamento?.descricao ||
      dadosPagamento?.nome_produto ||
      "")
      .slice(0, 37),
    customer: Object.keys(customer).length ? customer : undefined,
    metadata: dadosPagamento?.metadata,
  });
};

const criarPagamentoPix = async function (dadosPagamento, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType, isTeste);
  if (baseError) return baseError;

  const inputError = validatePixInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/pixQrCode/create`,
      createPixPayload(dadosPagamento),
      {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
      },
    );

    const data = response.data?.data || {};

    const controleUsuario = await registrarPagamentoAprovado({
      tipo: "PIX",
      providerId: data.id || null,
      status: data.status || null,
      amount: data.amount || Number(dadosPagamento?.amount || dadosPagamento?.valor_centavos),
      nomeProduto: dadosPagamento?.nome_produto || dadosPagamento?.description,
      email: data?.customer?.metadata?.email || dadosPagamento?.email,
      telefone: data?.customer?.metadata?.cellphone || dadosPagamento?.celular,
      prazo: data.expiresAt || null,
    });

    return {
      status: true,
      status_code: 201,
      message: "QR Code PIX criado com sucesso",
      pagamento: response.data,
      pix: {
        id: data.id || null,
        status: data.status || null,
        pix_copia_cola: data.brCode || null,
        qr_code_base64: data.brCodeBase64 || null,
        expires_at: data.expiresAt || null,
      },
      controle_usuario: controleUsuario,
    };
  } catch (error) {
    return handleProviderError(error, "/pixQrCode/create");
  }
};

const validateCardInput = (dadosPagamento) => {
  const { nome_produto, valor_centavos, email, nome, cpf_cnpj } =
    dadosPagamento || {};

  if (!nome_produto || !valor_centavos || !email || !nome || !cpf_cnpj) {
    return {
      status: false,
      status_code: 400,
      message:
        "Campos obrigatórios: nome_produto, valor_centavos, email, nome e cpf_cnpj.",
    };
  }

  if (Number.isNaN(Number(valor_centavos)) || Number(valor_centavos) <= 0) {
    return {
      status: false,
      status_code: 400,
      message: "valor_centavos deve ser um número maior que zero.",
    };
  }

  return null;
};

const createCardPayload = (dadosPagamento) => {
  const {
    external_id,
    nome_produto,
    descricao,
    quantidade,
    valor_centavos,
    email,
    nome,
    celular,
    cpf_cnpj,
    retorno_url,
    completion_url,
    customer_id,
    allow_coupons,
    coupons,
    metadata,
  } = dadosPagamento || {};

  return onlyDefined({
    frequency: "ONE_TIME",
    methods: ["CARD"],
    products: [
      {
        externalId: external_id || `prod_${Date.now()}`,
        name: nome_produto,
        description: descricao || nome_produto,
        quantity: Number(quantidade || 1),
        price: Number(valor_centavos),
      },
    ],
    returnUrl: retorno_url,
    completionUrl: completion_url,
    customerId: customer_id,
    customer: {
      name: nome,
      cellphone: celular,
      email,
      taxId: cpf_cnpj,
    },
    allowCoupons: allow_coupons,
    coupons,
    externalId: external_id,
    metadata,
  });
};

const criarPagamentoCartao = async function (dadosPagamento, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType, isTeste);
  if (baseError) return baseError;

  const inputError = validateCardInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/billing/create`,
      createCardPayload(dadosPagamento),
      {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
      },
    );

    const data = response.data?.data || {};

    const controleUsuario = await registrarPagamentoAprovado({
      tipo: "CARD",
      providerId: data.id || null,
      status: data.status || null,
      amount: data.amount || Number(dadosPagamento?.valor_centavos),
      nomeProduto: dadosPagamento?.nome_produto,
      email: data?.customer?.metadata?.email || dadosPagamento?.email,
      telefone: data?.customer?.metadata?.cellphone || dadosPagamento?.celular,
      prazo: null,
    });

    return {
      status: true,
      status_code: 201,
      message: "Pagamento com cartão criado com sucesso",
      pagamento: response.data,
      checkout_url: data.url || null,
      controle_usuario: controleUsuario,
    };
  } catch (error) {
    return handleProviderError(error, "/billing/create");
  }
};

const consultarPagamentoPix = async function (pixId, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType || "application/json", isTeste);
  if (baseError) return baseError;

  if (!pixId) {
    return {
      status: false,
      status_code: 400,
      message: "pix_id é obrigatório.",
    };
  }

  try {
    let response;

    try {
      response = await axios.get(`${ABACATEPAY_BASE_URL}/pixQrCode/check`, {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
        params: { id: pixId },
      });
    } catch (getError) {
      response = await axios.post(
        `${ABACATEPAY_BASE_URL}/pixQrCode/check`,
        { id: pixId },
        {
          timeout: 20000,
          headers: getCommonHeaders(isTeste),
        },
      );
    }

    const data = response.data?.data || {};

    const controleUsuario = await registrarPagamentoAprovado({
      tipo: "PIX",
      providerId: data.id || pixId,
      status: data.status || null,
      amount: data.amount || null,
      nomeProduto: data?.description || "Pagamento PIX",
      email: data?.customer?.metadata?.email || null,
      telefone: data?.customer?.metadata?.cellphone || null,
      prazo: data.expiresAt || null,
    });

    return {
      status: true,
      status_code: 200,
      message: "Status do PIX consultado com sucesso",
      pagamento: response.data,
      pix: {
        id: data.id || pixId,
        status: data.status || null,
        pago: data.status === "PAID",
        pix_copia_cola: data.brCode || null,
        qr_code_base64: data.brCodeBase64 || null,
        expires_at: data.expiresAt || null,
      },
      controle_usuario: controleUsuario,
    };
  } catch (error) {
    return handleProviderError(error, "/pixQrCode/check");
  }
};

const consultarPagamentoCartao = async function (billingId, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType || "application/json", isTeste);
  if (baseError) return baseError;

  if (!billingId) {
    return {
      status: false,
      status_code: 400,
      message: "billing_id é obrigatório.",
    };
  }

  try {
    let response;

    try {
      response = await axios.get(`${ABACATEPAY_BASE_URL}/billing/check`, {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
        params: { id: billingId },
      });
    } catch (getError) {
      response = await axios.post(
        `${ABACATEPAY_BASE_URL}/billing/check`,
        { id: billingId },
        {
          timeout: 20000,
          headers: getCommonHeaders(isTeste),
        },
      );
    }

    const data = response.data?.data || {};

    const controleUsuario = await registrarPagamentoAprovado({
      tipo: "CARD",
      providerId: data.id || billingId,
      status: data.status || null,
      amount: data.amount || null,
      nomeProduto: data?.products?.[0]?.name || "Pagamento Cartão",
      email: data?.customer?.metadata?.email || null,
      telefone: data?.customer?.metadata?.cellphone || null,
      prazo: null,
    });

    return {
      status: true,
      status_code: 200,
      message: "Status do pagamento com cartão consultado com sucesso",
      pagamento: response.data,
      checkout_url: data.url || null,
      cartao: {
        id: data.id || billingId,
        status: data.status || null,
        pago: data.status === "PAID",
      },
      controle_usuario: controleUsuario,
    };
  } catch (error) {
    return handleProviderError(error, "/billing/check");
  }
};


const criarPagamentoPixTeste = async function (dadosPagamento, contentType) {
  return criarPagamentoPix(dadosPagamento, contentType, true);
};

const criarPagamentoCartaoTeste = async function (dadosPagamento, contentType) {
  return criarPagamentoCartao(dadosPagamento, contentType, true);
};

const consultarPagamentoPixTeste = async function (pixId, contentType) {
  return consultarPagamentoPix(pixId, contentType, true);
};

const consultarPagamentoCartaoTeste = async function (billingId, contentType) {
  return consultarPagamentoCartao(billingId, contentType, true);
};

const criarPagamentoTeste = async function (dadosPagamento, contentType) {
  return criarPagamentoCartao(dadosPagamento, contentType, true);
};


module.exports = {
  criarPagamento: criarPagamentoCartao,
  criarPagamentoPix,
  criarPagamentoCartao,
  consultarPagamentoPix,
  consultarPagamentoCartao,
  criarPagamentoTeste,
  criarPagamentoPixTeste,
  criarPagamentoCartaoTeste,
  consultarPagamentoPixTeste,
  consultarPagamentoCartaoTeste,
};
