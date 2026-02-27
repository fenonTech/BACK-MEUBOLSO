/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const axios = require("axios");

const ABACATEPAY_BASE_URL =
  process.env.ABACATEPAY_BASE_URL || "https://api.abacatepay.com/v1";

const PAYMENT_METHODS = {
  pix: ["PIX"],
  cartao: ["CREDIT_CARD"],
  ambos: ["PIX", "CREDIT_CARD"],
};

const parsePaymentMethods = (metodoPagamento) => {
  if (!metodoPagamento) return PAYMENT_METHODS.ambos;
  return PAYMENT_METHODS[metodoPagamento] || null;
};

const buildPayload = (dadosPagamento, methods) => {
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
  } = dadosPagamento || {};

  return {
    frequency: "ONE_TIME",
    methods,
    products: [
      {
        externalId: external_id || `pedido_${Date.now()}`,
        name: nome_produto,
        description: descricao || nome_produto,
        quantity: Number(quantidade || 1),
        price: Number(valor_centavos),
      },
    ],
    customer: {
      name: nome,
      email,
      cellphone: celular,
      taxId: cpf_cnpj,
    },
    returnUrl: retorno_url,
  };
};

const validateInput = (dadosPagamento, contentType) => {
  if (!String(contentType || "").includes("application/json")) {
    return {
      status: false,
      status_code: 415,
      message: "Content-Type deve ser application/json",
    };
  }

  const apiKey = process.env.ABACATEPAY_API_KEY;

  if (!apiKey) {
    return {
      status: false,
      status_code: 500,
      message:
        "ABACATEPAY_API_KEY não configurada. Defina a variável de ambiente para usar esta rota.",
    };
  }

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

  return null;
};

const extractPixInfo = (responseData) => {
  const pix = responseData?.data?.pix || responseData?.pix || {};

  return {
    qr_code: pix.qrCode || pix.qr_code || null,
    pix_copia_cola: pix.brCode || pix.pixCopyPaste || pix.pix_copia_cola || null,
    expires_at: pix.expiresAt || pix.expires_at || null,
  };
};

const createBilling = async (dadosPagamento, contentType, methods) => {
  try {
    const inputError = validateInput(dadosPagamento, contentType);
    if (inputError) return inputError;

    const payload = buildPayload(dadosPagamento, methods);

    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/billing/create`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      status: true,
      status_code: 201,
      message: "Pagamento criado com sucesso",
      pagamento: response.data,
    };
  } catch (error) {
    return {
      status: false,
      status_code: error.response?.status || 500,
      message:
        error.response?.data?.message ||
        "Erro ao criar pagamento na Abacate Pay",
      erro: error.response?.data || error.message,
    };
  }
};

const criarPagamento = async function (dadosPagamento, contentType) {
  const methods = parsePaymentMethods(dadosPagamento?.metodo_pagamento);

  if (!methods) {
    return {
      status: false,
      status_code: 400,
      message: "metodo_pagamento inválido. Use: pix, cartao ou ambos.",
    };
  }

  return createBilling(dadosPagamento, contentType, methods);
};

const criarPagamentoPix = async function (dadosPagamento, contentType) {
  const resultado = await createBilling(dadosPagamento, contentType, PAYMENT_METHODS.pix);

  if (!resultado.status) return resultado;

  return {
    ...resultado,
    pix: extractPixInfo(resultado.pagamento),
  };
};

const criarPagamentoCartao = async function (dadosPagamento, contentType) {
  return createBilling(dadosPagamento, contentType, PAYMENT_METHODS.cartao);
};

module.exports = {
  criarPagamento,
  criarPagamentoPix,
  criarPagamentoCartao,
};
