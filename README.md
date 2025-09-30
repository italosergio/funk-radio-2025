# 🎵 Rádio Funk 2025

Uma rádio online em tempo real com streaming sincronizado entre múltiplos ouvintes.

## ✨ Funcionalidades

- 📻 **Streaming em tempo real** - Todos os ouvintes escutam a mesma música simultaneamente
- 🔄 **Sincronização perfeita** - Novos ouvintes entram na posição exata da música
- 🔇 **Controle de áudio** - Sistema de mute/unmute individual
- 👥 **Contador de ouvintes** - Veja quantas pessoas estão online
- 🎵 **Web Audio API** - Qualidade de áudio profissional
- 📱 **Interface responsiva** - Funciona em desktop e mobile

## 🚀 Demo

**[Acesse a rádio ao vivo](https://sua-url-do-render.com)**

## 🛠️ Tecnologias

### Frontend
- **React** - Interface do usuário
- **Vite** - Build tool moderna
- **Web Audio API** - Streaming de áudio avançado
- **Socket.io Client** - Comunicação em tempo real

### Backend
- **Node.js** - Servidor
- **Express** - Framework web
- **Socket.io** - WebSockets para sincronização
- **ES Modules** - JavaScript moderno

### Deploy
- **Render** - Hospedagem gratuita com suporte a WebSockets

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Desenvolvimento Local

1. **Clone o repositório**
```bash
git clone https://github.com/italosergio/funk-radio-2025.git
cd funk-radio-2025
```

2. **Instale as dependências**
```bash
# Dependências do frontend
npm install

# Dependências do servidor
cd server && npm install && cd ..
```

3. **Adicione suas músicas**
```bash
# Coloque arquivos .mp3 na pasta public/music/
# Formato recomendado: "Artista - Título.mp3"
```

4. **Execute em desenvolvimento**
```bash
npm run radio
```

5. **Acesse**
- Frontend: http://localhost:5173
- Servidor: http://localhost:3001

## 🎵 Adicionando Músicas

1. Coloque arquivos `.mp3` na pasta `public/music/`
2. Use o formato: `"Artista - Título.mp3"`
3. A rádio carrega automaticamente todas as músicas da pasta
4. Músicas tocam em loop aleatório

**Exemplo:**
```
public/music/
├── MC Du Black - Tudo Aconteceu.mp3
├── Anitta - Envolver.mp3
└── Ludmilla - Cheguei.mp3
```

## 🚀 Deploy

### Render (Recomendado - Gratuito)

1. **Fork este repositório**
2. **Acesse [Render.com](https://render.com)**
3. **Conecte sua conta GitHub**
4. **Crie um Web Service:**
   - **Build Command:** `npm install && npm run build && cd server && npm install`
   - **Start Command:** `npm start`
   - **Environment:** `NODE_ENV=production`

### Outras Plataformas

- **Railway:** Suporte nativo a WebSockets
- **Heroku:** Funciona com WebSockets
- **DigitalOcean App Platform:** Alternativa robusta

## 📁 Estrutura do Projeto

```
funk-radio-2025/
├── public/
│   └── music/              # Arquivos de música (.mp3)
├── server/
│   ├── package.json        # Dependências do servidor
│   └── server.js          # Servidor Node.js + Socket.io
├── src/
│   ├── App.jsx            # Componente principal
│   ├── App.css            # Estilos da rádio
│   ├── RadioStream.js     # Web Audio API
│   ├── index.css          # Estilos globais
│   └── main.jsx           # Entry point React
├── start.js               # Script de produção
├── render.yaml            # Configuração do Render
└── package.json           # Dependências do frontend
```

## ⚙️ Scripts Disponíveis

```bash
# Desenvolvimento (frontend + servidor)
npm run radio

# Apenas frontend
npm run dev

# Apenas servidor
npm run server

# Build para produção
npm run build

# Produção
npm start
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# .env (opcional)
NODE_ENV=production
PORT=3001
```

### Personalização

**Duração das músicas:**
```javascript
// server/server.js
let trackDuration = 180000 // 3 minutos em ms
```

**Cores da interface:**
```css
/* src/App.css */
.live-indicator {
  color: #ff4444; /* Cor do indicador AO VIVO */
}

.play-btn {
  background: #ff6b35; /* Cor do botão principal */
}
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📝 Roadmap

- [ ] Sistema de chat entre ouvintes
- [ ] Múltiplos canais/gêneros
- [ ] Sistema de requests de música
- [ ] Integração com APIs de música (Spotify, YouTube)
- [ ] Histórico de músicas tocadas
- [ ] Sistema de favoritos
- [ ] Modo DJ (controle manual)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Ítalo Sérgio**
- GitHub: [@italosergio](https://github.com/italosergio)

---

⭐ **Se gostou do projeto, deixe uma estrela!**