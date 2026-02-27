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

const buildBillingPayload = (dadosPagamento, methods) => {
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

  return onlyDefined({
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
    customer: onlyDefined({
      name: nome,
      email,
      cellphone: celular,
      taxId: cpf_cnpj,
    }),
    returnUrl: retorno_url,
  });
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

const validateBillingInput = (dadosPagamento) => {
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

const validatePixInput = (dadosPagamento) => {
  const amount = Number(dadosPagamento?.amount || dadosPagamento?.valor_centavos);
  const hasAnyCustomerField =
    dadosPagamento?.nome ||
    dadosPagamento?.cellphone ||
    dadosPagamento?.celular ||
    dadosPagamento?.email ||
    dadosPagamento?.cpf_cnpj ||
    dadosPagamento?.taxId;

  if (Number.isNaN(amount) || amount <= 0) {
    return {
      status: false,
      status_code: 400,
      message: "amount (ou valor_centavos) deve ser um número maior que zero.",
    };
  }

  if (hasAnyCustomerField) {
    const name = dadosPagamento?.nome || dadosPagamento?.name;
    const cellphone = dadosPagamento?.cellphone || dadosPagamento?.celular;
    const email = dadosPagamento?.email;
    const taxId = dadosPagamento?.taxId || dadosPagamento?.cpf_cnpj;

    if (!name || !cellphone || !email || !taxId) {
      return {
        status: false,
        status_code: 400,
        message:
          "Ao informar customer, os campos nome/name, cellphone/celular, email e taxId/cpf_cnpj são obrigatórios.",
      };
    }
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

const createBilling = async (dadosPagamento, methods) => {
  const payload = buildBillingPayload(dadosPagamento, methods);

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
    message: "Pagamento criado com sucesso",
    pagamento: response.data,
  };
};

const createPixQrCode = async (dadosPagamento) => {
  const amount = Number(dadosPagamento?.amount || dadosPagamento?.valor_centavos);
  const expiresIn = dadosPagamento?.expiresIn
    ? Number(dadosPagamento.expiresIn)
    : undefined;

  const descriptionBase =
    dadosPagamento?.description || dadosPagamento?.descricao || dadosPagamento?.nome_produto;

  const customerName = dadosPagamento?.name || dadosPagamento?.nome;
  const customerCellphone = dadosPagamento?.cellphone || dadosPagamento?.celular;
  const customerTaxId = dadosPagamento?.taxId || dadosPagamento?.cpf_cnpj;

  const customer =
    customerName || customerCellphone || dadosPagamento?.email || customerTaxId
      ? {
          name: customerName,
          cellphone: customerCellphone,
          email: dadosPagamento?.email,
          taxId: customerTaxId,
        }
      : undefined;

  const payload = onlyDefined({
    amount,
    expiresIn,
    description: descriptionBase ? String(descriptionBase).slice(0, 37) : undefined,
    customer,
  });

  const response = await axios.post(
    `${ABACATEPAY_BASE_URL}/pixQrCode/create`,
    payload,
    {
      timeout: 20000,
      headers: getCommonHeaders(),
    },
  );

  const data = response.data;
  const pix = data?.data || data || {};

  return {
    status: true,
    status_code: 201,
    message: "QR Code PIX criado com sucesso",
    pagamento: data,
    pix: {
      qr_code: pix?.qrCode || pix?.qr_code || pix?.qrCodeBase64 || null,
      pix_copia_cola: pix?.brCode || pix?.pixCopyPaste || pix?.copyPaste || null,
      expires_at: pix?.expiresAt || pix?.expires_at || null,
    },
  };
};

const handleProviderError = (error, endpointPath) => {
  const message = extractErrorMessage(error);

  return {
    status: false,
    status_code: error.response?.status || 500,
    message,
    erro: {
      provider_status: error.response?.status || null,
      provider_data: error.response?.data || null,
      request_url: `${ABACATEPAY_BASE_URL}${endpointPath}`,
    },
  };
};

const criarPagamento = async function (dadosPagamento, contentType) {
  const baseError = validateContentTypeAndApiKey(contentType);
  if (baseError) return baseError;

  const inputError = validateBillingInput(dadosPagamento);
  if (inputError) return inputError;

  const methods = parsePaymentMethods(dadosPagamento?.metodo_pagamento);

  if (!methods) {
    return {
      status: false,
      status_code: 400,
      message: "metodo_pagamento inválido. Use: pix, cartao ou ambos.",
    };
  }

  try {
    return await createBilling(dadosPagamento, methods);
  } catch (error) {
    return handleProviderError(error, "/billing/create");
  }
};

const criarPagamentoPix = async function (dadosPagamento, contentType) {
  const baseError = validateContentTypeAndApiKey(contentType);
  if (baseError) return baseError;

  const inputError = validatePixInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    return await createPixQrCode(dadosPagamento);
  } catch (error) {
    return handleProviderError(error, "/pixQrCode/create");
  }
};

const criarPagamentoCartao = async function (dadosPagamento, contentType) {
  const baseError = validateContentTypeAndApiKey(contentType);
  if (baseError) return baseError;

  const inputError = validateBillingInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    return await createBilling(dadosPagamento, PAYMENT_METHODS.cartao);
  } catch (error) {
    return handleProviderError(error, "/billing/create");
  }
};

module.exports = {
  criarPagamento,
  criarPagamentoPix,
  criarPagamentoCartao,
};
