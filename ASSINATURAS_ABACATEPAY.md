# Assinaturas Recorrentes — AbacatePay

Documentação para o frontend consumir a integração de assinaturas recorrentes com cartão de crédito via AbacatePay.

---

## Base URL

```
https://backend-pearl-rho-82.vercel.app/api
```

---

## Visão Geral do Fluxo

```
1. Frontend chama POST /pagamentos/assinatura com plano + ciclo
        ↓
2. Backend retorna checkout_url do AbacatePay
        ↓
3. Frontend redireciona o usuário para checkout_url
        ↓
4. Usuário insere os dados do cartão na página do AbacatePay
        ↓
5. AbacatePay processa o pagamento e notifica o backend (webhook automático)
        ↓
6. Backend ativa a assinatura do usuário automaticamente
        ↓
7. Usuário é redirecionado para completion_url
```

---

## Produtos Disponíveis

| Plano | Ciclo | produto_id |
|---|---|---|
| Essencial | Mensal | `prod_nMNc1Z0DgkAAyExPNJM5gzU0` |
| Essencial | Anual | `prod_5pggTS40mBK1EYZsYjAqk6dF` |
| Inteligente | Mensal | `prod_5jU0hScBNDqHGkhhAemCQJ0k` |
| Inteligente | Anual | `prod_z5EDRfygzX4BdwJYSnyCkjXt` |
| Visionário | Mensal | `prod_skDrLddqx20SjfCuQz6aaAXk` |
| Visionário | Anual | `prod_1DGA0HsQkXHCP34JuDtcTukD` |

---

## Endpoints

### 1. Criar Checkout de Assinatura

Gera o link de pagamento para o usuário assinar o plano escolhido.

```
POST /pagamentos/assinatura
Content-Type: application/json
```

**Body — Opção A (recomendada): plano + ciclo**

```json
{
  "plano": "essencial",
  "ciclo": "mensal",
  "completion_url": "https://seuapp.com/assinatura/sucesso",
  "retorno_url": "https://seuapp.com/planos"
}
```

**Body — Opção B: produto_id direto**

```json
{
  "produto_id": "prod_nMNc1Z0DgkAAyExPNJM5gzU0",
  "completion_url": "https://seuapp.com/assinatura/sucesso",
  "retorno_url": "https://seuapp.com/planos"
}
```

**Campos do Body**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `plano` | string | Sim* | `essencial`, `inteligente` ou `visionario` |
| `ciclo` | string | Sim* | `mensal` ou `anual` |
| `produto_id` | string | Sim* | ID do produto AbacatePay (alternativa a plano+ciclo) |
| `completion_url` | string (URL) | Não | Página para redirecionar após pagamento concluído |
| `retorno_url` | string (URL) | Não | Página ao clicar em "Voltar" no checkout |
| `customer_id` | string | Não | ID de cliente já cadastrado no AbacatePay |
| `external_id` | string | Não | ID da assinatura no seu sistema |
| `metadata` | object | Não | Dados adicionais livres |

> *Informe `plano` + `ciclo` **ou** `produto_id`. Não é necessário os dois.

**Resposta de sucesso — 201**

```json
{
  "status": true,
  "status_code": 201,
  "message": "Checkout de assinatura criado. Redirecione o cliente para checkout_url.",
  "checkout_url": "https://checkout.abacatepay.com/...",
  "subscription_id": "bill_abc123xyz",
  "assinatura": { }
}
```

**Resposta de erro — 400**

```json
{
  "status": false,
  "status_code": 400,
  "message": "Informe produto_id diretamente, ou plano (essencial | inteligente | visionario) + ciclo (mensal | anual)."
}
```

**Exemplo de uso**

```javascript
const response = await fetch('/api/pagamentos/assinatura', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    plano: 'essencial',
    ciclo: 'mensal',
    completion_url: 'https://seuapp.com/assinatura/sucesso',
    retorno_url: 'https://seuapp.com/planos',
  }),
});

const data = await response.json();

if (data.status) {
  window.location.href = data.checkout_url; // redireciona para o checkout
}
```

---

### 2. Listar Assinaturas

Retorna os checkouts de assinatura do AbacatePay. Útil para consultar o status de uma assinatura.

```
GET /pagamentos/assinaturas
```

**Query params (todos opcionais)**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | string | Filtrar por status: `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`, `REFUNDED` |
| `id` | string | Filtrar por ID do checkout (ex: `bill_abc123xyz`) |
| `email` | string | Filtrar por e-mail do cliente |
| `tax_id` | string | Filtrar por CPF/CNPJ |
| `external_id` | string | Filtrar pelo ID no seu sistema |
| `limit` | number | Quantidade de itens (1–100, padrão: 100) |
| `after` | string | Cursor para próxima página |
| `before` | string | Cursor para página anterior |

**Resposta de sucesso — 200**

```json
{
  "status": true,
  "status_code": 200,
  "message": "Assinaturas listadas com sucesso",
  "assinaturas": [
    {
      "id": "bill_abc123xyz",
      "status": "PAID",
      "url": "https://checkout.abacatepay.com/...",
      "amount": 1990,
      "paidAmount": 1990,
      "items": [{ "id": "prod_nMNc1Z0DgkAAyExPNJM5gzU0", "quantity": 1 }],
      "customerId": null,
      "devMode": false,
      "createdAt": "2026-03-16T10:00:00.000Z",
      "updatedAt": "2026-03-16T10:05:00.000Z"
    }
  ],
  "paginacao": {
    "hasMore": false,
    "next": null,
    "before": null
  }
}
```

---

### 3. Listar Produtos

Retorna os produtos de assinatura cadastrados no AbacatePay.

```
GET /pagamentos/assinatura/produtos
```

**Query params (todos opcionais)**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `status` | string | `ACTIVE` ou `INACTIVE` |
| `id` | string | Filtrar por ID do produto |
| `external_id` | string | Filtrar pelo ID no seu sistema |
| `limit` | number | Quantidade de itens (1–100, padrão: 100) |

**Resposta de sucesso — 200**

```json
{
  "status": true,
  "status_code": 200,
  "message": "Produtos listados com sucesso",
  "produtos": [
    {
      "id": "prod_nMNc1Z0DgkAAyExPNJM5gzU0",
      "externalId": "essencial-mensal",
      "name": "Plano Essencial Mensal",
      "price": 1990,
      "currency": "BRL",
      "cycle": "MONTHLY",
      "status": "ACTIVE",
      "createdAt": "2026-03-16T10:00:00.000Z"
    }
  ],
  "paginacao": {
    "hasMore": false,
    "next": null,
    "before": null
  }
}
```

---

## Ambientes de Teste

Todos os endpoints possuem versão de teste que usa a API key de sandbox do AbacatePay. Os dados **não são cobrados** em produção.

| Produção | Teste |
|---|---|
| `POST /pagamentos/assinatura` | `POST /pagamentos/teste/assinatura` |
| `GET /pagamentos/assinaturas` | `GET /pagamentos/teste/assinaturas` |
| `GET /pagamentos/assinatura/produtos` | `GET /pagamentos/teste/assinatura/produtos` |

---

## Status da Assinatura

| Status | Descrição |
|---|---|
| `PENDING` | Checkout criado, aguardando pagamento |
| `PAID` | Pagamento realizado — assinatura ativa |
| `EXPIRED` | Checkout expirou sem pagamento |
| `CANCELLED` | Assinatura cancelada |
| `REFUNDED` | Pagamento estornado |

---

## Webhook (automático — sem ação do frontend)

O AbacatePay notifica o backend automaticamente nos seguintes eventos:

| Evento | Quando ocorre | Ação no backend |
|---|---|---|
| `subscription.subscribed` | Primeiro pagamento aprovado | Ativa o plano do usuário |
| `subscription.renewed` | Renovação mensal/anual paga | Renova o prazo do plano |
| `subscription.canceled` | Assinatura cancelada | Cancela o histórico |

> O frontend **não precisa fazer nada** nesse fluxo. A ativação é automática.

---

## Valores dos Planos

> Os valores abaixo são de referência. Confirme os valores atuais no painel do AbacatePay.

| Plano | Mensal | Anual |
|---|---|---|
| Essencial | R$ 19,90 | — |
| Inteligente | R$ 39,90 | — |
| Visionário | R$ 59,90 | — |

---

## Observações

- O `plano` aceita com ou sem acento: `visionario` e `visionário` funcionam da mesma forma.
- O `ciclo` aceita apenas `mensal` ou `anual`.
- A `completion_url` recebe o usuário após o pagamento ser concluído — use para mostrar uma tela de sucesso.
- A `retorno_url` é a URL do botão "Voltar" dentro do checkout do AbacatePay.
- O usuário só é redirecionado para `completion_url` **após o pagamento ser aprovado**.
