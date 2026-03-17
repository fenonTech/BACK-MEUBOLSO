/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const axios = require("axios");
const controllerAssinatura = require("../assinatura/controllerAssinatura.js");

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

// Delega toda a lógica de ativação ao controllerAssinatura
const registrarPagamentoAprovado = ({ tipo, providerId, status, amount, nomeProduto, email, telefone, prazo }) =>
  controllerAssinatura.ativarAssinaturaAbacatePay({
    tipo,
    checkoutId: providerId,
    status,
    amount,
    nomeProduto,
    email,
    telefone,
    prazo,
  });

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
      email: data?.customer?.email || dadosPagamento?.email,
      telefone: data?.customer?.cellphone || dadosPagamento?.celular,
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
      email: data?.customer?.email || dadosPagamento?.email,
      telefone: data?.customer?.cellphone || dadosPagamento?.celular,
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
      email: data?.customer?.email || null,
      telefone: data?.customer?.cellphone || null,
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
      email: data?.customer?.email || null,
      telefone: data?.customer?.cellphone || null,
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

/**
 * Confirmação direta de pagamento com cartão.
 * Chamado pelo frontend quando o Abacate Pay redireciona para completion_url.
 * O redirect para completion_url só ocorre após pagamento aprovado — não é necessário
 * consultar o status na API do provider.
 */
const confirmarPagamentoCartao = async function (dados, contentType) {
  if (!String(contentType || "").includes("application/json")) {
    return { status: false, status_code: 415, message: "Content-Type deve ser application/json" };
  }

  const { billingId, nomeProduto, email, telefone } = dados || {};

  if (!billingId || !nomeProduto || !email) {
    return {
      status: false,
      status_code: 400,
      message: "billingId, nomeProduto e email s\u00e3o obrigat\u00f3rios.",
    };
  }

  const resultado = await controllerAssinatura.ativarAssinaturaAbacatePay({
    tipo: "CARD",
    checkoutId: billingId,
    status: "PAID", // confiamos no redirect da completion_url
    nomeProduto,
    email,
    telefone: telefone || null,
    prazo: null,
  });

  return {
    ...resultado,
    status_code: resultado.status ? 200 : 422,
  };
};


// ============================================================
// ASSINATURAS RECORRENTES COM CARTÃO (AbacatePay Subscription - API v2)
// ============================================================
//
// Fluxo correto conforme documentação AbacatePay:
//   1. Crie um produto com cycle (MONTHLY, WEEKLY, etc.) via criarProdutoAssinatura
//      → O produto deve ter nome contendo "Essencial", "Inteligente" ou "Visionário"
//        para o mapeamento automático de plano_id funcionar.
//   2. Use o produto_id retornado para criar a assinatura via criarAssinaturaCartao
//      → Retorna checkout_url para redirecionar o cliente
//   3. O AbacatePay dispara webhook POST /webhook/abacatepay quando o cliente paga
//
// ⚠️  Endpoints de assinaturas e produtos usam v2 da API AbacatePay.
// ============================================================

const ABACATEPAY_BASE_URL_V2 = "https://api.abacatepay.com/v2";

const CYCLES_VALIDOS = ["WEEKLY", "MONTHLY", "SEMIANNUALLY", "ANNUALLY"];

// Mapeamento plano + ciclo → produto_id AbacatePay
const PRODUTOS_ASSINATURA = {
  essencial: {
    mensal:  "prod_nMNc1Z0DgkAAyExPNJM5gzU0",
    anual:   "prod_5pggTS40mBK1EYZsYjAqk6dF",
  },
  inteligente: {
    mensal:  "prod_5jU0hScBNDqHGkhhAemCQJ0k",
    anual:   "prod_z5EDRfygzX4BdwJYSnyCkjXt",
  },
  visionario: {
    mensal:  "prod_skDrLddqx20SjfCuQz6aaAXk",
    anual:   "prod_1DGA0HsQkXHCP34JuDtcTukD",
  },
};

const resolverProdutoId = (dados) => {
  const { produto_id, plano, ciclo } = dados || {};

  if (produto_id) return produto_id;

  if (plano && ciclo) {
    const planoNorm = plano.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cicloNorm = ciclo.toLowerCase();
    return PRODUTOS_ASSINATURA[planoNorm]?.[cicloNorm] || null;
  }

  return null;
};

/**
 * Cria um produto de assinatura no AbacatePay.
 * O produto deve ter nome contendo "Essencial", "Inteligente" ou "Visionário"
 * para o mapeamento automático de plano_id no webhook funcionar.
 *
 * Body: { external_id, nome, valor_centavos, cycle?, descricao?, image_url? }
 * cycle: "WEEKLY" | "MONTHLY" | "SEMIANNUALLY" | "ANNUALLY"  (padrão: "MONTHLY")
 */
const criarProdutoAssinatura = async function (dados, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType, isTeste);
  if (baseError) return baseError;

  const { external_id, nome, valor_centavos, cycle, descricao, image_url } = dados || {};

  if (!external_id || !nome || !valor_centavos) {
    return {
      status: false,
      status_code: 400,
      message: "external_id, nome e valor_centavos são obrigatórios.",
    };
  }

  if (Number.isNaN(Number(valor_centavos)) || Number(valor_centavos) <= 0) {
    return {
      status: false,
      status_code: 400,
      message: "valor_centavos deve ser um número maior que zero.",
    };
  }

  const cycleFinal = (cycle || "MONTHLY").toUpperCase();

  if (!CYCLES_VALIDOS.includes(cycleFinal)) {
    return {
      status: false,
      status_code: 400,
      message: `cycle inválido. Valores aceitos: ${CYCLES_VALIDOS.join(", ")}`,
    };
  }

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL_V2}/products/create`,
      onlyDefined({
        externalId: external_id,
        name: nome,
        price: Number(valor_centavos),
        currency: "BRL",
        cycle: cycleFinal,
        description: descricao,
        imageUrl: image_url,
      }),
      { timeout: 20000, headers: getCommonHeaders(isTeste) },
    );

    return {
      status: true,
      status_code: 201,
      message: "Produto de assinatura criado com sucesso",
      produto: response.data?.data || response.data,
    };
  } catch (error) {
    return handleProviderError(error, "/v2/products/create");
  }
};

/**
 * Lista os produtos cadastrados no AbacatePay.
 * Use para consultar os IDs dos produtos de assinatura.
 *
 * Query (opcional): { status?, id?, external_id?, limit?, after?, before? }
 */
const listarProdutos = async function (filtros, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType || "application/json", isTeste);
  if (baseError) return baseError;

  const { status, id, external_id, limit, after, before } = filtros || {};

  try {
    const response = await axios.get(
      `${ABACATEPAY_BASE_URL_V2}/products/list`,
      {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
        params: onlyDefined({ status, id, externalId: external_id, limit, after, before }),
      },
    );

    return {
      status: true,
      status_code: 200,
      message: "Produtos listados com sucesso",
      produtos: response.data?.data || [],
      paginacao: response.data?.pagination || null,
    };
  } catch (error) {
    return handleProviderError(error, "/v2/products/list");
  }
};

/**
 * Cria um checkout de assinatura recorrente com cartão.
 * Retorna checkout_url que o cliente acessa para inserir os dados do cartão.
 * O AbacatePay dispara o webhook após o primeiro pagamento.
 *
 * Body: { produto_id, retorno_url?, completion_url?, customer_id?, external_id?, metadata? }
 * produto_id: ID do produto criado via criarProdutoAssinatura (ex: "prod_abc123xyz")
 */
const criarAssinaturaCartao = async function (dados, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType, isTeste);
  if (baseError) return baseError;

  const { retorno_url, completion_url, customer_id, external_id, metadata } = dados || {};

  const produto_id = resolverProdutoId(dados);

  if (!produto_id) {
    return {
      status: false,
      status_code: 400,
      message:
        "Informe produto_id diretamente, ou plano (essencial | inteligente | visionario) + ciclo (mensal | anual).",
    };
  }

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL_V2}/subscriptions/create`,
      onlyDefined({
        items: [{ id: produto_id, quantity: 1 }],
        returnUrl: retorno_url,
        completionUrl: completion_url,
        customerId: customer_id,
        externalId: external_id,
        metadata,
      }),
      { timeout: 20000, headers: getCommonHeaders(isTeste) },
    );

    const data = response.data?.data || {};

    return {
      status: true,
      status_code: 201,
      message: "Checkout de assinatura criado. Redirecione o cliente para checkout_url.",
      assinatura: response.data,
      checkout_url: data.url || null,
      subscription_id: data.id || null,
    };
  } catch (error) {
    return handleProviderError(error, "/v2/subscriptions/create");
  }
};

/**
 * Lista os checkouts de assinatura do AbacatePay.
 *
 * Query (opcional): { status?, id?, email?, tax_id?, external_id?, limit?, after?, before? }
 */
const listarAssinaturasAbacatePay = async function (filtros, contentType, isTeste = false) {
  const baseError = validateBaseInput(contentType || "application/json", isTeste);
  if (baseError) return baseError;

  const { status, id, email, tax_id, external_id, limit, after, before } = filtros || {};

  try {
    const response = await axios.get(
      `${ABACATEPAY_BASE_URL_V2}/subscriptions/list`,
      {
        timeout: 20000,
        headers: getCommonHeaders(isTeste),
        params: onlyDefined({ status, id, email, taxId: tax_id, externalId: external_id, limit, after, before }),
      },
    );

    return {
      status: true,
      status_code: 200,
      message: "Assinaturas listadas com sucesso",
      assinaturas: response.data?.data || [],
      paginacao: response.data?.pagination || null,
    };
  } catch (error) {
    return handleProviderError(error, "/v2/subscriptions/list");
  }
};

// Versões de teste
const criarProdutoAssinaturaTeste = (dados, ct) => criarProdutoAssinatura(dados, ct, true);
const listarProdutosTeste = (filtros, ct) => listarProdutos(filtros, ct, true);
const criarAssinaturaCartaoTeste = (dados, ct) => criarAssinaturaCartao(dados, ct, true);
const listarAssinaturasAbacatePayTeste = (filtros, ct) => listarAssinaturasAbacatePay(filtros, ct, true);

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
  confirmarPagamentoCartao,
  // Assinaturas recorrentes (v2)
  criarProdutoAssinatura,
  listarProdutos,
  criarAssinaturaCartao,
  listarAssinaturasAbacatePay,
  criarProdutoAssinaturaTeste,
  listarProdutosTeste,
  criarAssinaturaCartaoTeste,
  listarAssinaturasAbacatePayTeste,
};
