/**************************************************************************
 * Objetivo: Arquivo de rotas da API MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

const bodyParserJson = bodyParser.json();

// Importar Controllers
const controllerAuth = require('../controller/authController.js');
const controllerUsuario = require('../controller/usuario/controllerUsuario.js');
const controllerTransacao = require('../controller/transacao/controllerTransacao.js');
const controllerAssinatura = require('../controller/assinatura/controllerAssinatura.js');

// ==============================
// ROTAS DE AUTENTICAÇÃO
// ==============================

router.post('/auth/enviar-codigo', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerAuth.enviarCodigo(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.post('/auth/validar-codigo', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerAuth.validarCodigo(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.post('/auth/validar-assinatura', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerAuth.validarAssinatura(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

// ==============================
// ROTAS DE USUÁRIOS
// ==============================

router.post('/usuarios', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerUsuario.inserirUsuario(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.put('/usuarios/:id', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let id = request.params.id;
    let dadosBody = request.body;

    let resultado = await controllerUsuario.atualizarUsuario(id, dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.delete('/usuarios/:id', bodyParserJson, async (request, response) => {
    let id = request.params.id;

    let resultado = await controllerUsuario.excluirUsuario(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/usuarios', bodyParserJson, async (request, response) => {
    let resultado = await controllerUsuario.listarUsuarios();

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/usuarios/:id', bodyParserJson, async (request, response) => {
    let id = request.params.id;

    let resultado = await controllerUsuario.buscarUsuarioPorId(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/usuarios/telefone/:telefone', bodyParserJson, async (request, response) => {
    let telefone = request.params.telefone;

    let resultado = await controllerUsuario.buscarUsuarioPorTelefone(telefone);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.post('/usuarios/:id/incrementar-mensagens', bodyParserJson, async (request, response) => {
    let id = request.params.id;

    let resultado = await controllerUsuario.incrementarMensagens(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

// ==============================
// ROTAS DE TRANSAÇÕES
// ==============================

router.post('/transacoes', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerTransacao.inserirTransacao(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.put('/transacoes/:codigo', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let codigo = request.params.codigo;
    let dadosBody = request.body;

    let resultado = await controllerTransacao.atualizarTransacao(codigo, dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.delete('/transacoes/:codigo', bodyParserJson, async (request, response) => {
    let codigo = request.params.codigo;

    let resultado = await controllerTransacao.excluirTransacao(codigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/transacoes/usuario/:user_id', bodyParserJson, async (request, response) => {
    let user_id = request.params.user_id;

    let resultado = await controllerTransacao.listarTransacoesPorUsuario(user_id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/transacoes/:codigo', bodyParserJson, async (request, response) => {
    let codigo = request.params.codigo;

    let resultado = await controllerTransacao.buscarTransacaoPorCodigo(codigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/transacoes/usuario/:user_id/despesas', bodyParserJson, async (request, response) => {
    let user_id = request.params.user_id;
    let filters = {
        mes: request.query.mes,
        ano: request.query.ano,
        tipo: request.query.tipo
    };

    let resultado = await controllerTransacao.listarDespesas(user_id, filters);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/transacoes/usuario/:user_id/entradas', bodyParserJson, async (request, response) => {
    let user_id = request.params.user_id;
    let filters = {
        mes: request.query.mes,
        ano: request.query.ano
    };

    let resultado = await controllerTransacao.listarEntradas(user_id, filters);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/transacoes/usuario/:user_id/resumo', bodyParserJson, async (request, response) => {
    let user_id = request.params.user_id;
    let filters = {
        mes: request.query.mes,
        ano: request.query.ano
    };

    let resultado = await controllerTransacao.obterResumo(user_id, filters);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

// ==============================
// ROTAS DE ASSINATURAS
// ==============================

router.post('/assinaturas', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let dadosBody = request.body;

    let resultado = await controllerAssinatura.criarAssinatura(dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.put('/assinaturas/:id', bodyParserJson, async (request, response) => {
    let contentType = request.headers['content-type'];
    let id = request.params.id;
    let dadosBody = request.body;

    let resultado = await controllerAssinatura.atualizarAssinatura(id, dadosBody, contentType);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.post('/assinaturas/:id/cancelar', bodyParserJson, async (request, response) => {
    let id = request.params.id;

    let resultado = await controllerAssinatura.cancelarAssinatura(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/assinaturas/:id', bodyParserJson, async (request, response) => {
    let id = request.params.id;

    let resultado = await controllerAssinatura.buscarAssinaturaPorId(id);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/assinaturas/usuario/:usuarioCodigo', bodyParserJson, async (request, response) => {
    let usuarioCodigo = request.params.usuarioCodigo;

    let resultado = await controllerAssinatura.buscarAssinaturaPorUsuario(usuarioCodigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/assinaturas/usuario/:usuarioCodigo/verificar', bodyParserJson, async (request, response) => {
    let usuarioCodigo = request.params.usuarioCodigo;

    let resultado = await controllerAssinatura.verificarAssinaturaAtiva(usuarioCodigo);

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

router.get('/assinaturas', bodyParserJson, async (request, response) => {
    let resultado = await controllerAssinatura.listarAssinaturas();

    response.status(resultado.status_code || 200);
    response.json(resultado);
});

module.exports = router;
