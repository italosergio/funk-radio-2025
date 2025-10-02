# 🔐 Configuração Google OAuth

Para o sistema de login funcionar, você precisa configurar as credenciais do Google OAuth.

## 📋 Passo a passo:

### 1. Acesse o Google Cloud Console
- Vá para: https://console.developers.google.com/
- Faça login com sua conta Google

### 2. Crie um novo projeto (ou use existente)
- Clique em "Criar Projeto"
- Nome: "Funk Radio 2025"

### 3. Ative a API do Google+
- No menu lateral: "APIs e Serviços" > "Biblioteca"
- Procure por "Google+ API" e ative

### 4. Configure OAuth 2.0
- Vá em "APIs e Serviços" > "Credenciais"
- Clique em "Criar Credenciais" > "ID do cliente OAuth 2.0"
- Tipo: "Aplicação da Web"

### 5. Configure URLs autorizadas
**Origens JavaScript autorizadas:**
- http://localhost:3001 (desenvolvimento)
- https://funk-radio-2025.onrender.com (produção)

**URIs de redirecionamento autorizados:**
- http://localhost:3001/auth/google/callback (desenvolvimento)
- https://funk-radio-2025.onrender.com/auth/google/callback (produção)

### 6. Copie as credenciais
- Client ID: `1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`
- Client Secret: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

### 7. Configure variáveis de ambiente

**Desenvolvimento (.env):**
```bash
GOOGLE_CLIENT_ID=seu-client-id-real
GOOGLE_CLIENT_SECRET=seu-client-secret-real
SESSION_SECRET=uma-chave-secreta-aleatoria
NODE_ENV=development
```

**Produção (Render.com):**
- Vá nas configurações do seu app no Render
- Adicione as Environment Variables:
  - `GOOGLE_CLIENT_ID`: seu client ID
  - `GOOGLE_CLIENT_SECRET`: seu client secret
  - `SESSION_SECRET`: uma chave secreta
  - `NODE_ENV`: production

## ✅ Teste
Após configurar, o login com Google deve funcionar normalmente!

## 🚨 Importante
- Nunca commite as credenciais reais no Git
- Use sempre variáveis de ambiente
- As URLs de callback devem estar exatamente iguais