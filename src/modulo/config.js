/**************************************************************************
 * Objetivo: Arquivo de padronização de mensagens e status code para API MeuBolso
 * Data: 10/01/2026
 * Autor: Israel
 **************************************************************************/

/************************** MENSAGENS DE ERRO ***************************/

const ERROR_REQUIRED_FIELDS = {
    status: false,
    status_code: 400,
    message: "Existem campos obrigatórios que não foram preenchidos ou ultrapassaram a quantidade de caracteres. A requisição não pode ser realizada !!!"
}

const ERROR_INTERNAL_SERVER_CONTROLLER = {
    status: false,
    status_code: 500,
    message: "Não foi possível processar a requisição, pois ocorreram erros internos no servidor da CONTROLLER  !!!"
}

const ERROR_INTERNAL_SERVER_MODEL = {
    status: false,
    status_code: 500,
    message: "Não foi possível processar a requisição pois ocorreram erros internos no servidor da MODEL !!"
}

const ERROR_CONTENT_TYPE = {
    status: false,
    status_code: 415,
    message: "Não foi possível processar a requisição pois o formato de dados encaminhado não é suportado pelo servidor. Favor encaminhar apenas JSON !!"
}

const ERROR_NOT_FOUND = {
    status: false,
    status_code: 404,
    message: "Não foram encontrados itens para retornar!!"
}

const ERROR_UNAUTHORIZED = {
    status: false,
    status_code: 401,
    message: "Não autorizado. Código inválido ou expirado!"
}

const ERROR_INVALID_CODE = {
    status: false,
    status_code: 400,
    message: "Não possível prosseguir pois o código está inválido"
}

const ERROR_CODE_EXPIRED = {
    status: false,
    status_code: 400,
    message: "Não foi possível prosseguir pois o código está expirado"
}

const ERROR_INVALID_CREDENTIALS = {
    status: false,
    status_code: 400,
    message: "Credenciais inválidas"
}

const ERROR_ASSINATURA_NAO_ENCONTRADA = {
    status: false,
    status_code: 404,
    message: "Assinatura não encontrada"
}

const ERROR_ASSINATURA_EXPIRADA = {
    status: false,
    status_code: 403,
    message: "Assinatura expirada"
}

const ERROR_USUARIO_JA_EXISTE = {
    status: false,
    status_code: 409,
    message: "Usuário já existe"
}

const ERROR_TRANSACAO_NAO_ENCONTRADA = {
    status: false,
    status_code: 404,
    message: "Transação não encontrada"
}

/************************** MENSAGENS DE SUCESSO ***************************/

const SUCCESS_CREATED_ITEM = {
    status: true,
    status_code: 201,
    message: "Item criado com sucesso !!!"
}

const SUCCESS_DELETED_ITEM = {
    status: true,
    status_code: 200,
    message: "Item deletado com sucesso !!!"
}

const SUCCESS_UPDATED_ITEM = {
    status: true,
    status_code: 200,
    message: "Item atualizado com sucesso !!"
}

const SUCCESS_REQUEST = {
    status: true,
    status_code: 200,
    message: "Requisição realizada com sucesso!"
}

const SUCCESS_CODE_SENT = {
    status: true,
    status_code: 200,
    message: "Código enviado com sucesso!"
}

const SUCCESS_CODE_VALID = {
    status: true,
    status_code: 200,
    message: "Código validado com sucesso!"
}

const SUCCESS_ASSINATURA_VALIDA = {
    status: true,
    status_code: 200,
    message: "Assinatura válida!"
}

module.exports = {
    ERROR_REQUIRED_FIELDS,
    ERROR_INTERNAL_SERVER_CONTROLLER,
    ERROR_INTERNAL_SERVER_MODEL,
    ERROR_CONTENT_TYPE,
    ERROR_NOT_FOUND,
    ERROR_UNAUTHORIZED,
    ERROR_INVALID_CODE,
    ERROR_CODE_EXPIRED,
    ERROR_INVALID_CREDENTIALS,
    ERROR_ASSINATURA_NAO_ENCONTRADA,
    ERROR_ASSINATURA_EXPIRADA,
    ERROR_USUARIO_JA_EXISTE,
    ERROR_TRANSACAO_NAO_ENCONTRADA,
    SUCCESS_CREATED_ITEM,
    SUCCESS_DELETED_ITEM,
    SUCCESS_UPDATED_ITEM,
    SUCCESS_REQUEST,
    SUCCESS_CODE_SENT,
    SUCCESS_CODE_VALID,
    SUCCESS_ASSINATURA_VALIDA
};