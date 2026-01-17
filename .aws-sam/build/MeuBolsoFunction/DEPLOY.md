# Deploy API MeuBolso para AWS Lambda

## Pré-requisitos

1. **AWS CLI** instalado e configurado
```bash
aws configure
```

2. **AWS SAM CLI** instalado
```bash
# Windows (Chocolatey)
choco install aws-sam-cli

# Ou baixe o instalador MSI:
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

3. **Node.js 20.x** instalado

## Passos para Deploy

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e edite com seus valores:
```bash
cp samconfig.toml.example samconfig.toml
```

Edite `samconfig.toml` com:
- Seu bucket S3 (será criado se não existir)
- URL do Supabase
- Chave anônima do Supabase
- Domínio personalizado (opcional)
- ID da Hosted Zone do Route53 (se usar domínio customizado)

### 3. Build da Aplicação
```bash
npm run build
# ou
sam build
```

### 4. Deploy para AWS

**Primeira vez (modo interativo):**
```bash
npm run deploy
# ou
sam deploy --guided
```

**Deploys subsequentes (usa samconfig.toml):**
```bash
sam deploy
```

## URL da API Após Deploy

### URL Padrão (API Gateway)
```
https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
```

### URL Customizada (se configurado)
```
https://api.meubolso.com/
```

## Endpoints

Todos os endpoints mantêm a mesma estrutura:

```
# Local
POST http://localhost:3000/api/usuarios

# Lambda (URL padrão)
POST https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/api/usuarios

# Lambda (URL customizada)
POST https://api.meubolso.com/api/usuarios
```

## Atualizar API (Deploy Automático)

Sempre que você modificar qualquer arquivo do projeto:

```bash
# 1. Build
npm run build

# 2. Deploy
sam deploy
```

**✅ SIM, qualquer mudança nos endpoints será automaticamente enviada para o Lambda após o deploy!**

## Testar Localmente

```bash
# Inicia API Gateway local
npm run local

# Testa no navegador ou Postman
http://localhost:3000/api/usuarios
```

## Monitoramento

### Ver Logs em Tempo Real
```bash
sam logs -n meubolso-api --tail
```

### Ver Logs de uma função específica
```bash
sam logs -n MeuBolsoFunction --stack-name meubolso-api-stack --tail
```

## Comandos Úteis

```bash
# Ver informações do stack
aws cloudformation describe-stacks --stack-name meubolso-api-stack

# Ver URL da API
aws cloudformation describe-stacks \
  --stack-name meubolso-api-stack \
  --query 'Stacks[0].Outputs'

# Deletar stack (remove tudo)
aws cloudformation delete-stack --stack-name meubolso-api-stack
```

## Configurar Domínio Customizado

### 1. Ter um domínio no Route53

### 2. Criar Certificado SSL (ACM)
O template.yaml já cria automaticamente se você fornecer o HostedZoneId.

### 3. Configurar DNS
Após o deploy, o SAM cria automaticamente os registros DNS no Route53.

### 4. Testar
```bash
curl https://api.meubolso.com/health
```

## Estrutura de Custos (Estimativa)

**AWS Lambda:**
- 1M requisições grátis/mês
- $0.20 por 1M requisições adicionais

**API Gateway:**
- 1M requisições = ~$3.50/mês

**Dados Supabase:**
- Conforme plano escolhido

## Troubleshooting

### Erro: "No bucket named..."
Crie um bucket S3 manualmente:
```bash
aws s3 mb s3://meubolso-lambda-deploy-bucket
```

### Erro: "Invalid request..."
Verifique se as credenciais AWS estão configuradas:
```bash
aws sts get-caller-identity
```

### Erro: "Function timeout"
Aumente o timeout no template.yaml:
```yaml
Timeout: 60
```

## Rollback

Se algo der errado:
```bash
# Voltar para versão anterior
aws cloudformation rollback-stack --stack-name meubolso-api-stack
```
