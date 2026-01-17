/**************************************************************************
 * Objetivo: Handler Lambda para API MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const serverlessExpress = require("@vendia/serverless-express");
const app = require("./app");

// Inicializar o serverless-express FORA do handler para reutilização em warm starts
let serverlessExpressInstance;

async function setup(event, context) {
  // Configurar contexto Lambda para não esperar event loop vazio
  context.callbackWaitsForEmptyEventLoop = false;

  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

function handler(event, context) {
  // Otimização: não esperar event loop vazio (permite reutilização de conexões)
  context.callbackWaitsForEmptyEventLoop = false;

  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return setup(event, context);
}

exports.handler = handler;
