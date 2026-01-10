/**************************************************************************
 * Objetivo: Handler Lambda para API MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 * Versão: 1.0
 **************************************************************************/

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

let serverlessExpressInstance;

async function setup(event, context) {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

function handler(event, context) {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return setup(event, context);
}

exports.handler = handler;
