/**************************************************************************
 * Objetivo: Controller para integração com Abacate Pay
 * Data: 27/02/2026
 * Autor: Codex
 **************************************************************************/

const axios = require("axios");

const ABACATEPAY_BASE_URL =
  process.env.ABACATEPAY_BASE_URL || "https://api.abacatepay.com/v1";

const parsePaymentMethods = (metodoPagamento) => {
  if (!metodoPagamento || metodoPagamento === "ambos") {
    return ["PIX", "CREDIT_CARD"];
  }

  if (metodoPagamento === "pix") {
    return ["PIX"];
  }

  if (metodoPagamento === "cartao") {
    return ["CREDIT_CARD"];
  }

  return null;
};

const criarPagamento = async function (dadosPagamento, contentType) {
  try {
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

    const {
      metodo_pagamento,
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

    const methods = parsePaymentMethods(metodo_pagamento);

    if (!methods) {
      return {
        status: false,
        status_code: 400,
        message:
          "metodo_pagamento inválido. Use: pix, cartao ou ambos.",
      };
    }

    if (!nome_produto || !valor_centavos || !email || !nome || !cpf_cnpj) {
      return {
        status: false,
        status_code: 400,
        message:
          "Campos obrigatórios: nome_produto, valor_centavos, email, nome e cpf_cnpj.",
      };
    }

    const payload = {
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

    const response = await axios.post(
      `${ABACATEPAY_BASE_URL}/billing/create`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
    const status = error.response?.status || 500;

    return {
      status: false,
      status_code: status,
      message:
        error.response?.data?.message ||
        "Erro ao criar pagamento na Abacate Pay",
      erro: error.response?.data || error.message,
    };
  }
};

module.exports = {
  criarPagamento,
};
