/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay (somente cartão)
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const axios = require("axios");

const ABACATEPAY_BASE_URL =
  process.env.ABACATEPAY_BASE_URL || "https://api.abacatepay.com/v1";

const onlyDefined = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const getCommonHeaders = () => {
  const apiKey = process.env.ABACATEPAY_API_KEY;

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
};

const validateContentTypeAndApiKey = (contentType) => {
  if (!String(contentType || "").includes("application/json")) {
    return {
      status: false,
      status_code: 415,
      message: "Content-Type deve ser application/json",
    };
  }

  if (!process.env.ABACATEPAY_API_KEY) {
    return {
      status: false,
      status_code: 500,
      message:
        "ABACATEPAY_API_KEY não configurada. Defina a variável de ambiente para usar esta rota.",
    };
  }

  return null;
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

const extractErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data === "string") return data;

  return (
    data?.message ||
    data?.error ||
    data?.details ||
    (Array.isArray(data?.errors)
      ? data.errors.map((e) => e?.message || e).join("; ")
      : null) ||
    error?.message ||
    "Erro ao criar pagamento na Abacate Pay"
  );
};

const buildCardPayload = (dadosPagamento) => {
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
    customer: onlyDefined({
      name: nome,
      cellphone: celular,
      email,
      taxId: cpf_cnpj,
    }),
  });
};

const createCardBilling = async (dadosPagamento) => {
  const payload = buildCardPayload(dadosPagamento);

  const response = await axios.post(
    `${ABACATEPAY_BASE_URL}/billing/create`,
    payload,
    {
      timeout: 20000,
      headers: getCommonHeaders(),
    },
  );

  return {
    status: true,
    status_code: 201,
    message: "Pagamento com cartão criado com sucesso",
    pagamento: response.data,
  };
};

const handleProviderError = (error) => ({
  status: false,
  status_code: error.response?.status || 500,
  message: extractErrorMessage(error),
  erro: {
    provider_status: error.response?.status || null,
    provider_data: error.response?.data || null,
    request_url: `${ABACATEPAY_BASE_URL}/billing/create`,
  },
});

const criarPagamentoCartao = async function (dadosPagamento, contentType) {
  const baseError = validateContentTypeAndApiKey(contentType);
  if (baseError) return baseError;

  const inputError = validateCardInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    return await createCardBilling(dadosPagamento);
  } catch (error) {
    return handleProviderError(error);
  }
};

module.exports = {
  criarPagamento: criarPagamentoCartao,
  criarPagamentoCartao,
};
