/**************************************************************************
 * Objetivo: Arquivo de rotas da API MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 2.0 - Otimizado (removido body-parser redundante)
 **************************************************************************/

const express = require("express");
const router = express.Router();

// Importar Middleware
const { autenticar } = require("../middleware/authMiddleware.js");

// Importar Controllers (carregados uma vez no início)
const controllerAuth = require("../controller/authController.js");
const controllerUsuario = require("../controller/usuario/controllerUsuario.js");
const controllerTransacao = require("../controller/transacao/controllerTransacao.js");
const controllerAssinatura = require("../controller/assinatura/controllerAssinatura.js");
const controllerIdentificador = require("../controller/indentificador/controllerIdentificador.js");
const controllerPagamento = require("../controller/pagamento/controllerPagamento.js");

// ==============================
// ROTAS DE AUTENTICAÇÃO
// ==============================

router.post("/auth/cadastrar", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerAuth.cadastrarUsuario(dadosBody, contentType);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.post("/auth/gerar-codigo", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerAuth.enviarCodigo(dadosBody, contentType);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.post("/auth/validar-codigo", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerAuth.validarCodigo(dadosBody, contentType);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

// Rota de LOGIN (valida código + assinatura + retorna JWT)
router.post("/auth/login", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerAuth.login(dadosBody, contentType);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.get("/auth/validar-assinatura/:telefone", async (request, response) => {
  let telefone = request.params.telefone;
  0;
  let resultado = await controllerAuth.validarAssinatura(
    { telefone },
    "application/json",
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

// ==============================
// WEBHOOK CAKTO (SEM AUTENTICAÇÃO)
// ==============================

router.post("/assinatura", async (request, response) => {
  let dadosBody = request.body;

  let resultado = await controllerAssinatura.webhookCakto(dadosBody);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

// ==============================
// ROTA DE USUÁRIO (PROTEGIDA)
// ==============================

// Buscar dados do usuário logado (para tela de configurações)
router.get("/usuarios/me", autenticar, async (request, response) => {
  let user_id = request.usuarioId;

  let resultado = await controllerUsuario.buscarUsuarioPorId(user_id);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.put(
  "/usuarios/perfil",
  autenticar,

  async (request, response) => {
    let contentType = request.headers["content-type"];
    let user_id = request.usuarioId;
    let dadosBody = request.body;

    // Validar campos permitidos (apenas nome por enquanto)
    const dadosPermitidos = {
      nome: dadosBody.nome,
    };

    let resultado = await controllerUsuario.atualizarUsuario(
      user_id,
      dadosPermitidos,
      contentType,
    );

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

router.post(
  "/usuarios/incrementar-mensagens",
  autenticar,

  async (request, response) => {
    // Pegar id do token automaticamente
    let id = request.usuarioId;

    let resultado = await controllerUsuario.incrementarMensagens(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

// ==============================
// ROTAS DE TRANSAÇÕES (PROTEGIDAS)
// ==============================

router.post("/transacoes", autenticar, async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  // Adicionar user_id automaticamente do token
  dadosBody.user_id = request.usuarioId;

  let resultado = await controllerTransacao.inserirTransacao(
    dadosBody,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.put(
  "/transacoes/:codigo",
  autenticar,

  async (request, response) => {
    let contentType = request.headers["content-type"];
    let codigo = request.params.codigo;
    let dadosBody = request.body;
    let user_id = request.usuarioId;

    let resultado = await controllerTransacao.atualizarTransacao(
      codigo,
      dadosBody,
      contentType,
      user_id,
    );

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

router.delete(
  "/transacoes/:codigo",
  autenticar,

  async (request, response) => {
    let codigo = request.params.codigo;
    let user_id = request.usuarioId;

    let resultado = await controllerTransacao.excluirTransacao(codigo, user_id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);
router.get(
  "/transacoes/:codigo",
  autenticar,

  async (request, response) => {
    let codigo = request.params.codigo;

    let resultado = await controllerTransacao.buscarTransacaoPorCodigo(codigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);
router.get(
  "/transacoes",
  autenticar,

  async (request, response) => {
    let user_id = request.usuarioId;
    let filters = {
      mes: request.query.mes,
      ano: request.query.ano,
    };

    let resultado = await controllerTransacao.listarTransacoesPorUsuario(
      user_id,
      filters,
    );

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

// Rotas simplificadas
router.get("/despesas", autenticar, async (request, response) => {
  let user_id = request.usuarioId;
  let filters = {
    mes: request.query.mes,
    ano: request.query.ano,
  };

  let resultado = await controllerTransacao.listarDespesas(user_id, filters);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.get(
  "/entradas",
  autenticar,

  async (request, response) => {
    let user_id = request.usuarioId;
    let filters = {
      mes: request.query.mes,
      ano: request.query.ano,
    };

    let resultado = await controllerTransacao.listarEntradas(user_id, filters);

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

router.get("/resumo", autenticar, async (request, response) => {
  let user_id = request.usuarioId;
  let filters = {
    mes: request.query.mes,
    ano: request.query.ano,
  };

  let resultado = await controllerTransacao.obterResumo(user_id, filters);

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

// ==============================
// ROTAS DE ASSINATURAS (PROTEGIDAS)
// ==============================

router.post("/assinaturas", autenticar, async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  // Adicionar usuario_codigo automaticamente do token
  dadosBody.usuario_codigo = request.usuarioId;

  let resultado = await controllerAssinatura.criarAssinatura(
    dadosBody,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

router.get(
  "/assinaturas/minhas",
  autenticar,

  async (request, response) => {
    // Pegar usuario_codigo do token automaticamente
    let usuarioCodigo = request.usuarioId;

    let resultado =
      await controllerAssinatura.buscarAssinaturaPorUsuario(usuarioCodigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

// ==============================
// ROTA DE PAGAMENTOS (SEM AUTENTICAÇÃO)
// ==============================

router.post("/pagamentos", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerPagamento.criarPagamento(
    dadosBody,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});


router.post("/pagamentos/pix", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerPagamento.criarPagamentoPix(
    dadosBody,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});


router.get("/pagamentos/pix/:pix_id/status", async (request, response) => {
  let contentType = request.headers["content-type"] || "application/json";
  let pixId = request.params.pix_id;

  let resultado = await controllerPagamento.consultarPagamentoPix(
    pixId,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});


router.get(
  "/pagamentos/cartao/:billing_id/status",
  async (request, response) => {
    let contentType = request.headers["content-type"] || "application/json";
    let billingId = request.params.billing_id;

    let resultado = await controllerPagamento.consultarPagamentoCartao(
      billingId,
      contentType,
    );

    response.status(resultado.status_code || 200);
    response.json(resultado);
  },
);

router.post("/pagamentos/cartao", async (request, response) => {
  let contentType = request.headers["content-type"];
  let dadosBody = request.body;

  let resultado = await controllerPagamento.criarPagamentoCartao(
    dadosBody,
    contentType,
  );

  response.status(resultado.status_code || 200);
  response.json(resultado);
});

// ==============================
// ROTA DE IDENTIFICADOR (SEM AUTENTICAÇÃO)
// ==============================

/**
 * Endpoint para processar mensagens em linguagem natural
 * Recebe telefone + mensagem e identifica automaticamente transações
 */
router.post("/identificador", async (req, res) => {
  try {
    console.log("📥 [IDENTIFICADOR] Requisição recebida");
    const { telefone, mensagem } = req.body;

    // Validação de entrada
    if (!telefone || !mensagem) {
      console.log("❌ [IDENTIFICADOR] Campos obrigatórios ausentes");
      return res.status(400).json({
        status: "erro",
        message: "Telefone e mensagem são obrigatórios",
      });
    }

    console.log("📞 Telefone:", telefone);
    console.log("💬 Mensagem:", mensagem);

    // Buscar usuário pelo telefone
    console.log("🔍 Buscando usuário...");
    const resultadoUsuario =
      await controllerUsuario.buscarUsuarioPorTelefone(telefone);

    if (resultadoUsuario.status_code !== 200) {
      console.log("❌ Usuário não encontrado para o telefone:", telefone);
      return res.status(404).json({
        status: "erro",
        message: "Usuário não encontrado",
      });
    }

    const user_id = resultadoUsuario.usuario.id;
    console.log("👤 Usuário encontrado - ID:", user_id);

    // Processar mensagem e criar transação
    console.log("🔄 Processando mensagem...");
    const resultado = await controllerIdentificador.processarMensagem(
      mensagem,
      user_id,
      telefone, // Passar telefone para envio de mensagens
    );

    // Verificar resultado do processamento
    const isErro =
      resultado.status_code &&
      resultado.status_code !== 200 &&
      resultado.status_code !== 201;

    if (isErro) {
      console.log("❌ Erro ao processar mensagem:", resultado.message);
      return res.status(resultado.status_code).json({
        status: resultado.status || "erro",
        message: resultado.message || "Erro ao processar mensagem",
      });
    }

    // Se for consulta de transações, enviar relatório via WhatsApp
    if (resultado.relatorio) {
      console.log("📊 Enviando relatório via WhatsApp...");
      await controllerIdentificador.enviarMensagemWhatsApp(
        telefone,
        resultado.relatorio,
      );
    }

    // Retornar sucesso
    console.log("✅ Processamento concluído com sucesso");
    return res.status(200).json({
      status: "sucesso",
      message: resultado.message || "Operação realizada com sucesso",
      transacao: resultado.transacao,
      relatorio: resultado.relatorio,
    });
  } catch (error) {
    console.error("❌ [IDENTIFICADOR] Erro interno:", error);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      status: "erro",
      message: "Erro interno no servidor",
    });
  }
});

module.exports = router;
