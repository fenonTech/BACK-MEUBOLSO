# API MeuBolso - Documentação de Endpoints

API RESTful para gerenciamento financeiro usando Node.js e Supabase.

Base URL: `http://localhost:3000/api`

---

## 📋 Índice

1. [Endpoint Principal (MeuBolso)](#endpoint-principal-meubolso)
2. [Autenticação](#autenticação)
3. [Usuários](#usuários)
4. [Transações](#transações)

---

## 🎯 Endpoint Principal (MeuBolso)

Este endpoint replica toda a lógica do webhook do n8n em uma única rota.

### POST `/api/meubolso`

Processa todas as requisições baseado na tela e tipo de método.

**Body:**
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "receita|despesa|dashboard|configuracao",
    "tipoMetodo": "post|get|update|delete",
    // ... campos específicos da operação
  }
}
```

**Exemplos:**

#### Criar Receita/Despesa (POST)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "receita",
    "tipoMetodo": "post",
    "valor": 1500.00,
    "categoria": "Salário",
    "isEntrada": true,
    "dataPagamento": "2026-01-10T00:00:00Z"
  }
}
```

#### Atualizar Transação (UPDATE)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "despesa",
    "tipoMetodo": "update",
    "codigoTransacao": "abc123...",
    "valor": 250.00,
    "categoria": "Alimentação",
    "dataPagamento": "2026-01-10T00:00:00Z"
  }
}
```

#### Deletar Transação (DELETE)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "receita",
    "tipoMetodo": "delete",
    "codigoTransacao": "abc123..."
  }
}
```

#### Listar Despesas (GET)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "despesa",
    "tipoMetodo": "get"
  }
}
```

#### Dashboard - Todas Transações (GET)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "dashboard",
    "tipoMetodo": "get"
  }
}
```

#### Configuração - Atualizar Dados (UPDATE)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "configuracao",
    "tipoMetodo": "update",
    "usuarioNome": "João Silva",
    "usuarioEmail": "joao@email.com"
  }
}
```

#### Configuração - Buscar Dados (GET)
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456",
  "dadosRequisicao": {
    "tela": "configuracao",
    "tipoMetodo": "get"
  }
}
```

---

## 🔐 Autenticação

### POST `/api/auth/enviar-codigo`

Envia código de autenticação por SMS (em desenvolvimento, retorna código no console).

**Body:**
```json
{
  "telefone": "+5511999999999"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Código enviado com sucesso",
  "data": {
    "mensagem": "Código enviado com sucesso",
    "codigo": "123456"  // Apenas em desenvolvimento
  }
}
```

---

### POST `/api/auth/validar-codigo`

Valida código de autenticação enviado.

**Body:**
```json
{
  "telefone": "+5511999999999",
  "codigoTemp": "123456"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Código validado com sucesso",
  "data": {
    "mansagem": "valido"
  }
}
```

**Response (Erro - Código Expirado):**
```json
{
  "success": false,
  "message": "Código expirado"
}
```

---

### POST `/api/auth/validar-assinatura`

Valida se usuário possui assinatura ativa.

**Body:**
```json
{
  "telefone": "+5511999999999"
}
```

**Response (Assinatura Válida):**
```json
{
  "success": true,
  "message": "Assinatura válida",
  "data": {
    "acessoLiberado": true,
    "nomeAssinatura": "Premium",
    "prazo": "2026-12-31T23:59:59Z"
  }
}
```

**Response (Sem Assinatura - 404):**
```json
{
  "error": {
    "status": 404,
    "message": "Sem assinatura"
  }
}
```

**Response (Assinatura Expirada - 403):**
```json
{
  "error": {
    "status": 403,
    "message": "Assinatura expirada"
  }
}
```

---

## 👤 Usuários

### POST `/api/usuarios`

Criar novo usuário.

**Body:**
```json
{
  "telefone": "+5511999999999",
  "nome": "João Silva",
  "email": "joao@email.com"
}
```

---

### GET `/api/usuarios/:id`

Buscar usuário por ID.

**Response:**
```json
{
  "success": true,
  "message": "Dados recuperados com sucesso",
  "data": {
    "id": "uuid-here",
    "nome": "João Silva",
    "telefone": "+5511999999999",
    "email": "joao@email.com",
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

### GET `/api/usuarios/telefone/:telefone`

Buscar usuário por telefone.

---

### PUT `/api/usuarios/:id`

Atualizar usuário.

**Body:**
```json
{
  "nome": "João Silva Atualizado",
  "email": "joao.novo@email.com"
}
```

---

### DELETE `/api/usuarios/:id`

Deletar usuário.

---

## 💰 Transações

### POST `/api/transacoes`

Criar nova transação.

**Body:**
```json
{
  "userId": "user-uuid",
  "valor": 150.50,
  "categoria": "Alimentação",
  "isEntrada": false,
  "dataPagamento": "2026-01-10T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registro criado com sucesso",
  "data": {
    "id": "uuid",
    "codigo": "abc123def456...",
    "user_id": "user-uuid",
    "valor": 150.50,
    "tipo": "Alimentação",
    "is_entrada": false,
    "data_pagamento": "2026-01-10T00:00:00Z",
    "created_at": "2026-01-10T12:00:00Z"
  }
}
```

---

### GET `/api/transacoes/usuario/:userId`

Listar todas as transações de um usuário.

**Response:**
```json
{
  "success": true,
  "message": "Dados recuperados com sucesso",
  "data": {
    "nomeUsuario": "João Silva",
    "dados": [
      {
        "id": "uuid",
        "codigo": "abc123...",
        "valor": 150.50,
        "tipo": "Alimentação",
        "is_entrada": false,
        "data_pagamento": "2026-01-10T00:00:00Z"
      }
    ]
  }
}
```

---

### GET `/api/transacoes/usuario/:userId/despesas`

Listar apenas despesas (is_entrada = false).

---

### GET `/api/transacoes/usuario/:userId/entradas`

Listar apenas receitas/entradas (is_entrada = true).

---

### GET `/api/transacoes/usuario/:userId/totais`

Calcular totais (dashboard).

**Response:**
```json
{
  "success": true,
  "message": "Dados recuperados com sucesso",
  "data": {
    "nomeUsuario": "João Silva",
    "totalEntradas": 5000.00,
    "totalDespesas": 2500.00,
    "saldo": 2500.00
  }
}
```

---

### GET `/api/transacoes/codigo/:codigo`

Buscar transação por código único.

---

### PUT `/api/transacoes/codigo/:codigo`

Atualizar transação por código.

**Body:**
```json
{
  "valor": 200.00,
  "categoria": "Transporte",
  "dataPagamento": "2026-01-11T00:00:00Z"
}
```

---

### DELETE `/api/transacoes/codigo/:codigo`

Deletar transação por código.

---

## 📊 Códigos de Status HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🔒 Segurança

- Rate limiting configurado
- Validação de dados com express-validator
- Headers de segurança com Helmet
- CORS habilitado

---

## 🚀 Como Usar

1. Configure o `.env` com suas credenciais do Supabase
2. Instale as dependências: `npm install`
3. Execute em desenvolvimento: `npm run dev`
4. Execute em produção: `npm start`

---

## 📝 Estrutura do Banco (Supabase)

### Tabela: usuarios
- id (UUID, PK)
- telefone (String, Unique)
- nome (String)
- email (String)
- created_at (Timestamp)
- updated_at (Timestamp)

### Tabela: transacoes
- id (UUID, PK)
- codigo (String, Unique)
- user_id (UUID, FK -> usuarios.id)
- valor (Decimal)
- tipo (String) - categoria
- is_entrada (Boolean) - true = receita, false = despesa
- data_pagamento (Date)
- created_at (Timestamp)
- updated_at (Timestamp)

### Tabela: assinaturas
- id (UUID, PK)
- user_id (UUID, FK -> usuarios.id)
- nomeAssinatura (String)
- prazo (Timestamp)
- acessoLiberado (Boolean)
- created_at (Timestamp)
- updated_at (Timestamp)

---

## 💳 Pagamentos (Abacate Pay)

> Rotas públicas (não exigem JWT).

### POST `/api/pagamentos/pix`

Gera QR Code PIX usando `POST /v1/pixQrCode/create`.

**Body:**
```json
{
  "amount": 123,
  "expiresIn": 123,
  "description": "Pagamento",
  "name": "Daniel Lima",
  "cellphone": "(11) 4002-8922",
  "email": "daniel_lima@abacatepay.com",
  "taxId": "123.456.789-01"
}
```

**Retorno útil:** `pix.pix_copia_cola`, `pix.qr_code_base64`, `pix.expires_at`.


### GET `/api/pagamentos/pix/:pix_id/status`

Consulta o status do QR Code PIX criado anteriormente.

**Retorno útil:**
- `pix.status` (ex.: `PENDING`, `PAID`)
- `pix.pago` (`true` quando `status === "PAID"`)

### GET `/api/pagamentos/cartao/:billing_id/status`

Consulta o status do pagamento de cartão criado anteriormente.

**Retorno útil:**
- `cartao.status` (ex.: `PENDING`, `PAID`)
- `cartao.pago` (`true` quando `status === "PAID"`)
- `persistencia` (resultado da atualização no banco)

### POST `/api/pagamentos/cartao`

Cria cobrança com cartão e retorna o link para checkout.

**Body:**
```json
{
  "nome_produto": "Assinatura de Programa Fitness",
  "descricao": "Acesso ao programa fitness premium por 1 mês.",
  "quantidade": 2,
  "valor_centavos": 2000,
  "nome": "Daniel Lima",
  "celular": "(11) 4002-8922",
  "email": "daniel_lima@abacatepay.com",
  "cpf_cnpj": "123.456.789-01",
  "retorno_url": "https://example.com/billing",
  "completion_url": "https://example.com/completion"
}
```

**Retorno útil:** `checkout_url` (link para o usuário clicar e pagar).

### POST `/api/pagamentos`

Atalho para o mesmo fluxo de cartão (`/api/pagamentos/cartao`).


**Tabela esperada no banco (`pagamentos`)**

Campos usados pela API para controle: `provider_payment_id`, `provider`, `tipo`, `status`, `valor_centavos`, `pix_copia_cola`, `qr_code_base64`, `expires_at`, `checkout_url`, `raw_payload`, `created_at`, `updated_at`.
