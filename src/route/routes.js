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

// ==============================
// ROTAS DE AUTENTICAÇÃO
// ==============================

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

module.exports = router;
