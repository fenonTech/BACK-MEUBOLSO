/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay
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

const getCommonHeaders = () => ({
  Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
  "Content-Type": "application/json",
});

const validateBaseInput = (contentType) => {
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
      message: "ABACATEPAY_API_KEY não configurada.",
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

const criarPagamentoPix = async function (dadosPagamento, contentType) {
  const baseError = validateBaseInput(contentType);
  if (baseError) return baseError;

  const inputError = validatePixInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/pixQrCode/create`,
      createPixPayload(dadosPagamento),
      {
        timeout: 20000,
        headers: getCommonHeaders(),
      },
    );

    const data = response.data?.data || {};

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

const criarPagamentoCartao = async function (dadosPagamento, contentType) {
  const baseError = validateBaseInput(contentType);
  if (baseError) return baseError;

  const inputError = validateCardInput(dadosPagamento);
  if (inputError) return inputError;

  try {
    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/billing/create`,
      createCardPayload(dadosPagamento),
      {
        timeout: 20000,
        headers: getCommonHeaders(),
      },
    );

    const data = response.data?.data || {};

    return {
      status: true,
      status_code: 201,
      message: "Pagamento com cartão criado com sucesso",
      pagamento: response.data,
      checkout_url: data.url || null,
    };
  } catch (error) {
    return handleProviderError(error, "/billing/create");
  }
};

module.exports = {
  criarPagamento: criarPagamentoCartao,
  criarPagamentoPix,
  criarPagamentoCartao,
};
