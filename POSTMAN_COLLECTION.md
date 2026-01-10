# API MeuBolso - Coleção de Requisições

## AUTENTICAÇÃO

### 1. Enviar Código de Autenticação
```bash
curl -X POST http://localhost:3000/api/auth/enviar-codigo \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "5511999999999",
    "is_segundaValidacao": false
  }'
```

### 2. Validar Código
```bash
curl -X POST http://localhost:3000/api/auth/validar-codigo \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "5511999999999",
    "codigo": "123456",
    "nome": "João Silva",
    "email": "joao@email.com"
  }'
```

### 3. Validar Assinatura
```bash
curl -X POST http://localhost:3000/api/auth/validar-assinatura \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "5511999999999"
  }'
```

---

## USUÁRIOS

### 4. Criar Usuário
```bash
curl -X POST http://localhost:3000/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "telefone": "5511988888888",
    "email": "maria@email.com",
    "plano_id": 1,
    "renda_mensal": 5000
  }'
```

### 5. Atualizar Usuário
```bash
curl -X PUT http://localhost:3000/api/usuarios/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos Silva",
    "renda_mensal": 6000
  }'
```

### 6. Listar Todos os Usuários
```bash
curl -X GET http://localhost:3000/api/usuarios
```

### 7. Buscar Usuário por ID
```bash
curl -X GET http://localhost:3000/api/usuarios/1
```

### 8. Buscar Usuário por Telefone
```bash
curl -X GET http://localhost:3000/api/usuarios/telefone/5511999999999
```

### 9. Incrementar Mensagens do Usuário
```bash
curl -X POST http://localhost:3000/api/usuarios/1/incrementar-mensagens \
  -H "Content-Type: application/json"
```

### 10. Excluir Usuário
```bash
curl -X DELETE http://localhost:3000/api/usuarios/1
```

---

## TRANSAÇÕES

### 11. Criar Transação (Despesa)
```bash
curl -X POST http://localhost:3000/api/transacoes \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "descricao": "Almoço no restaurante",
    "valor": 50.00,
    "tipo": "alimentacao",
    "is_entrada": false,
    "data_pagamento": "2024-01-10T12:00:00Z"
  }'
```

### 12. Criar Transação (Entrada)
```bash
curl -X POST http://localhost:3000/api/transacoes \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "descricao": "Salário mensal",
    "valor": 5000.00,
    "tipo": "salario",
    "is_entrada": true,
    "data_pagamento": "2024-01-05T00:00:00Z"
  }'
```

### 13. Atualizar Transação
```bash
curl -X PUT http://localhost:3000/api/transacoes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Jantar no restaurante (atualizado)",
    "valor": 75.00
  }'
```

### 14. Listar Todas as Transações do Usuário
```bash
curl -X GET http://localhost:3000/api/transacoes/usuario/1
```

### 15. Buscar Transação por Código
```bash
curl -X GET http://localhost:3000/api/transacoes/1
```

### 16. Listar Despesas do Usuário
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/despesas"
```

### 17. Listar Despesas Filtradas por Mês e Ano
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/despesas?mes=1&ano=2024"
```

### 18. Listar Despesas por Tipo
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/despesas?tipo=alimentacao"
```

### 19. Listar Entradas do Usuário
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/entradas"
```

### 20. Listar Entradas Filtradas
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/entradas?mes=1&ano=2024"
```

### 21. Obter Resumo Financeiro
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/resumo"
```

### 22. Obter Resumo Filtrado por Período
```bash
curl -X GET "http://localhost:3000/api/transacoes/usuario/1/resumo?mes=1&ano=2024"
```

### 23. Excluir Transação
```bash
curl -X DELETE http://localhost:3000/api/transacoes/1
```

---

## ASSINATURAS

### 24. Criar Assinatura
```bash
curl -X POST http://localhost:3000/api/assinaturas \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioCodigo": 1,
    "prazo": "2025-01-10",
    "plano_id_cakto": "plan_abc123",
    "plano_name_cakto": "Plano Premium",
    "subscription_id_cakto": "sub_xyz789"
  }'
```

### 25. Atualizar Assinatura
```bash
curl -X PUT http://localhost:3000/api/assinaturas/1 \
  -H "Content-Type: application/json" \
  -d '{
    "prazo": "2025-12-31",
    "plano_name_cakto": "Plano Premium Plus"
  }'
```

### 26. Cancelar Assinatura
```bash
curl -X POST http://localhost:3000/api/assinaturas/1/cancelar \
  -H "Content-Type: application/json"
```

### 27. Buscar Assinatura por ID
```bash
curl -X GET http://localhost:3000/api/assinaturas/1
```

### 28. Buscar Assinatura do Usuário
```bash
curl -X GET http://localhost:3000/api/assinaturas/usuario/1
```

### 29. Verificar se Assinatura está Ativa
```bash
curl -X GET http://localhost:3000/api/assinaturas/usuario/1/verificar
```

### 30. Listar Todas as Assinaturas
```bash
curl -X GET http://localhost:3000/api/assinaturas
```

---

## HEALTH CHECK

### 31. Verificar Status da API
```bash
curl -X GET http://localhost:3000/health
```

### 32. Rota Raiz
```bash
curl -X GET http://localhost:3000/
```

---

## FORMATO PARA IMPORTAR NO POSTMAN

Para importar no Postman:
1. Abra o Postman
2. Clique em "Import"
3. Cole as requisições abaixo no formato JSON

```json
{
  "info": {
    "name": "API MeuBolso",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Autenticação",
      "item": [
        {
          "name": "Enviar Código",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"telefone\": \"5511999999999\",\n  \"is_segundaValidacao\": false\n}"
            },
            "url": "http://localhost:3000/api/auth/enviar-codigo"
          }
        },
        {
          "name": "Validar Código",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"telefone\": \"5511999999999\",\n  \"codigo\": \"123456\",\n  \"nome\": \"João Silva\",\n  \"email\": \"joao@email.com\"\n}"
            },
            "url": "http://localhost:3000/api/auth/validar-codigo"
          }
        },
        {
          "name": "Validar Assinatura",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"telefone\": \"5511999999999\"\n}"
            },
            "url": "http://localhost:3000/api/auth/validar-assinatura"
          }
        }
      ]
    },
    {
      "name": "Usuários",
      "item": [
        {
          "name": "Criar Usuário",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"nome\": \"Maria Santos\",\n  \"telefone\": \"5511988888888\",\n  \"email\": \"maria@email.com\",\n  \"plano_id\": 1,\n  \"renda_mensal\": 5000\n}"
            },
            "url": "http://localhost:3000/api/usuarios"
          }
        },
        {
          "name": "Atualizar Usuário",
          "request": {
            "method": "PUT",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"nome\": \"Maria Santos Silva\",\n  \"renda_mensal\": 6000\n}"
            },
            "url": "http://localhost:3000/api/usuarios/1"
          }
        },
        {
          "name": "Listar Usuários",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/usuarios"
          }
        },
        {
          "name": "Buscar por ID",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/usuarios/1"
          }
        },
        {
          "name": "Buscar por Telefone",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/usuarios/telefone/5511999999999"
          }
        },
        {
          "name": "Incrementar Mensagens",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "http://localhost:3000/api/usuarios/1/incrementar-mensagens"
          }
        },
        {
          "name": "Excluir Usuário",
          "request": {
            "method": "DELETE",
            "url": "http://localhost:3000/api/usuarios/1"
          }
        }
      ]
    },
    {
      "name": "Transações",
      "item": [
        {
          "name": "Criar Transação",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"user_id\": 1,\n  \"descricao\": \"Almoço no restaurante\",\n  \"valor\": 50.00,\n  \"tipo\": \"alimentacao\",\n  \"is_entrada\": false,\n  \"data_pagamento\": \"2024-01-10T12:00:00Z\"\n}"
            },
            "url": "http://localhost:3000/api/transacoes"
          }
        },
        {
          "name": "Atualizar Transação",
          "request": {
            "method": "PUT",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"descricao\": \"Jantar atualizado\",\n  \"valor\": 75.00\n}"
            },
            "url": "http://localhost:3000/api/transacoes/1"
          }
        },
        {
          "name": "Listar por Usuário",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/usuario/1"
          }
        },
        {
          "name": "Buscar por Código",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/1"
          }
        },
        {
          "name": "Listar Despesas",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/usuario/1/despesas"
          }
        },
        {
          "name": "Listar Despesas Filtradas",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/usuario/1/despesas?mes=1&ano=2024"
          }
        },
        {
          "name": "Listar Entradas",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/usuario/1/entradas"
          }
        },
        {
          "name": "Resumo Financeiro",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/transacoes/usuario/1/resumo?mes=1&ano=2024"
          }
        },
        {
          "name": "Excluir Transação",
          "request": {
            "method": "DELETE",
            "url": "http://localhost:3000/api/transacoes/1"
          }
        }
      ]
    },
    {
      "name": "Assinaturas",
      "item": [
        {
          "name": "Criar Assinatura",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"usuarioCodigo\": 1,\n  \"prazo\": \"2025-01-10\",\n  \"plano_id_cakto\": \"plan_abc123\",\n  \"plano_name_cakto\": \"Plano Premium\",\n  \"subscription_id_cakto\": \"sub_xyz789\"\n}"
            },
            "url": "http://localhost:3000/api/assinaturas"
          }
        },
        {
          "name": "Atualizar Assinatura",
          "request": {
            "method": "PUT",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"prazo\": \"2025-12-31\"\n}"
            },
            "url": "http://localhost:3000/api/assinaturas/1"
          }
        },
        {
          "name": "Cancelar Assinatura",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": "http://localhost:3000/api/assinaturas/1/cancelar"
          }
        },
        {
          "name": "Buscar por ID",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/assinaturas/1"
          }
        },
        {
          "name": "Buscar por Usuário",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/assinaturas/usuario/1"
          }
        },
        {
          "name": "Verificar Status",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/assinaturas/usuario/1/verificar"
          }
        },
        {
          "name": "Listar Todas",
          "request": {
            "method": "GET",
            "url": "http://localhost:3000/api/assinaturas"
          }
        }
      ]
    }
  ]
}
```
