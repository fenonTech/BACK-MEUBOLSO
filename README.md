# API MEUBOLSO

API REST para gerenciamento financeiro com integração Supabase (PostgreSQL).

## 📋 Estrutura do Banco de Dados

### Tabelas

- **usuarios** - Dados dos usuários
- **transacoes** - Transações financeiras (entradas e despesas)
- **assinaturas** - Assinaturas dos usuários (Cakto)
- **codigo_temp** - Códigos temporários de autenticação
- **planos** - Planos disponíveis
- **servicos** - Serviços associados aos planos

## 🚀 Instalação

```bash
npm install
```

## ⚙️ Configuração

Crie o arquivo `.env`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
PORT=3000
NODE_ENV=development
```

## 🏃 Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📡 Endpoints da API

### Autenticação

#### Enviar Código
```http
POST /api/auth/enviar-codigo
Content-Type: application/json

{
  "telefone": "5511999999999",
  "is_segundaValidacao": false
}
```

#### Validar Código
```http
POST /api/auth/validar-codigo
Content-Type: application/json

{
  "telefone": "5511999999999",
  "codigo": "123456",
  "nome": "João Silva",
  "email": "joao@email.com"
}
```

#### Validar Assinatura
```http
POST /api/auth/validar-assinatura
Content-Type: application/json

{
  "telefone": "5511999999999"
}
```

### Usuários

#### Criar Usuário
```http
POST /api/usuarios
Content-Type: application/json

{
  "nome": "João Silva",
  "telefone": "5511999999999",
  "email": "joao@email.com",
  "plano_id": 1,
  "renda_mensal": 5000
}
```

#### Atualizar Usuário
```http
PUT /api/usuarios/:id
Content-Type: application/json

{
  "nome": "João Silva Atualizado",
  "renda_mensal": 6000
}
```

#### Listar Todos os Usuários
```http
GET /api/usuarios
```

#### Buscar Usuário por ID
```http
GET /api/usuarios/:id
```

#### Buscar Usuário por Telefone
```http
GET /api/usuarios/telefone/:telefone
```

#### Incrementar Mensagens
```http
POST /api/usuarios/:id/incrementar-mensagens
```

#### Excluir Usuário
```http
DELETE /api/usuarios/:id
```

### Transações

#### Criar Transação
```http
POST /api/transacoes
Content-Type: application/json

{
  "user_id": 1,
  "descricao": "Almoço no restaurante",
  "valor": 50.00,
  "tipo": "alimentacao",
  "is_entrada": false,
  "data_pagamento": "2024-01-10T12:00:00Z"
}
```

#### Atualizar Transação
```http
PUT /api/transacoes/:codigo
Content-Type: application/json

{
  "descricao": "Jantar atualizado",
  "valor": 75.00
}
```

#### Listar Transações do Usuário
```http
GET /api/transacoes/usuario/:user_id
```

#### Buscar Transação por Código
```http
GET /api/transacoes/:codigo
```

#### Listar Despesas
```http
GET /api/transacoes/usuario/:user_id/despesas?mes=1&ano=2024&tipo=alimentacao
```

#### Listar Entradas
```http
GET /api/transacoes/usuario/:user_id/entradas?mes=1&ano=2024
```

#### Obter Resumo Financeiro
```http
GET /api/transacoes/usuario/:user_id/resumo?mes=1&ano=2024
```

**Resposta:**
```json
{
  "status": true,
  "status_code": 200,
  "resumo": {
    "entradas": 5000.00,
    "despesas": 3000.00,
    "saldo": 2000.00
  }
}
```

#### Excluir Transação
```http
DELETE /api/transacoes/:codigo
```

### Assinaturas

#### Criar Assinatura
```http
POST /api/assinaturas
Content-Type: application/json

{
  "usuarioCodigo": 1,
  "prazo": "2025-01-10",
  "plano_id_cakto": "plan_123",
  "plano_name_cakto": "Plano Premium",
  "subscription_id_cakto": "sub_456"
}
```

#### Atualizar Assinatura
```http
PUT /api/assinaturas/:id
Content-Type: application/json

{
  "prazo": "2025-12-31"
}
```

#### Cancelar Assinatura
```http
POST /api/assinaturas/:id/cancelar
```

#### Buscar Assinatura por ID
```http
GET /api/assinaturas/:id
```

#### Buscar Assinatura do Usuário
```http
GET /api/assinaturas/usuario/:usuarioCodigo
```

#### Verificar Assinatura Ativa
```http
GET /api/assinaturas/usuario/:usuarioCodigo/verificar
```

#### Listar Todas as Assinaturas
```http
GET /api/assinaturas
```

## 🗄️ Schema do Banco de Dados

As tabelas já estão criadas no Supabase conforme o schema fornecido:

- `usuarios` - id, nome, telefone, email, mensagens, plano_id, trial_end, status_plano, renda_mensal
- `transacoes` - codigo, user_id, descricao, valor, tipo, is_entrada, data_pagamento
- `assinaturas` - id, usuarioCodigo, prazo, is_cancelado, plano_id_cakto, plano_name_cakto, subscription_id_cakto, dataCancelamento
- `codigo_temp` - id, codigo, telefone, expira_em, is_segundaValidacao
- `planos` - id, nome, preco, servico_id
- `servicos` - id, nome

## 🔧 Tecnologias

- Node.js
- Express
- Supabase (PostgreSQL)
- Body-parser
- CORS
- dotenv

## 📝 Padrões de Código

- Arquitetura MVC com DAO
- Controllers exportam funções
- DAOs usam Supabase client
- Mensagens padronizadas via `config.js`
- Respostas: `{ status, status_code, message, data }`

## 🔐 Segurança

- Autenticação via código SMS
- Códigos temporários com expiração (5 minutos)
- Validação de assinatura
- Trial de 5 dias
- CORS habilitado

## 📄 Licença

ISC
"# BACK-MEUBOLSO" 

## 💳 Pagamentos (Abacate Pay)

### Variáveis de ambiente

```env
ABACATEPAY_API_KEY=sua_chave_producao
ABACATEPAY_API_KEY_TEST=sua_chave_teste
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v1
```

### Endpoints públicos (produção)

#### Gerar PIX (QR Code)
```http
POST /api/pagamentos/pix
Content-Type: application/json

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

#### Consultar status do PIX
```http
GET /api/pagamentos/pix/:pix_id/status
```
Retornos úteis: `pix.status`, `pix.pago`, `controle_usuario`.

#### Criar cobrança de cartão
```http
POST /api/pagamentos/cartao
Content-Type: application/json

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
Retorno útil: `checkout_url`.

#### Consultar status do cartão
```http
GET /api/pagamentos/cartao/:billing_id/status
```
Retornos úteis: `cartao.status`, `cartao.pago`, `controle_usuario`.

#### Atalho para cartão
```http
POST /api/pagamentos
```

### Endpoints de teste (chave dev)

Usam `ABACATEPAY_API_KEY_TEST` com a mesma lógica dos endpoints de produção.

```http
POST /api/pagamentos/teste
POST /api/pagamentos/teste/pix
GET  /api/pagamentos/teste/pix/:pix_id/status
POST /api/pagamentos/teste/cartao
GET  /api/pagamentos/teste/cartao/:billing_id/status
```

### Persistência no banco

Quando o status do pagamento vem como `PAID`, a API tenta vincular o pagamento ao usuário e registrar controle nas tabelas existentes do projeto (`usuarios` e `historico_assinaturas`).
