import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseFile } from 'music-metadata'
import session from 'express-session'
import cors from 'cors'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Conectar ao MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://funkradio:funkradio2025@cluster0.mongodb.net/funkradio?retryWrites=true&w=majority'

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('📦 MongoDB Atlas conectado')
}).catch((error) => {
  console.error('❌ Erro ao conectar MongoDB Atlas:', error.message)
  console.log('⚠️ Continuando sem persistência de usuários')
})

// Schema do usuário
const UserSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  picture: String,
  given_name: String,
  family_name: String,
  listeningTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
})

const User = mongoose.model('User', UserSchema)

// Debug: verificar se as variáveis estão carregando
console.log('🔑 GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Não encontrado')
console.log('🔐 GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'Não encontrado')

const app = express()

// Sistema de usuários agora usa MongoDB

// Configuração do Passport
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-abcdefghijklmnopqrstuvwxyz',
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://radio-funk-2025.onrender.com/auth/google/callback'
    : 'http://localhost:3001/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Tenta usar MongoDB primeiro
    let user = await User.findOne({ googleId: profile.id }).catch(() => null)
    
    if (!user) {
      user = {
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value,
        given_name: profile._json.given_name,
        family_name: profile._json.family_name,
        listeningTime: 0,
        createdAt: new Date(),
        lastLogin: new Date()
      }
      
      // Tenta salvar no MongoDB
      try {
        const dbUser = new User(user)
        await dbUser.save()
        console.log('✨ Novo usuário criado no DB:', user.name)
      } catch (dbError) {
        console.log('⚠️ Usando usuário temporário:', user.name)
      }
    } else {
      user.lastLogin = new Date()
      await user.save().catch(() => {})
      console.log('🔄 Usuário carregado:', user.name)
    }
    
    done(null, user)
  } catch (error) {
    console.error('Erro no OAuth:', error)
    done(error, null)
  }
}))

passport.serializeUser((user, done) => {
  done(null, user.googleId)
})

passport.deserializeUser(async (googleId, done) => {
  try {
    const user = await User.findOne({ googleId })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

// Middleware
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'funk-radio-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}))
app.use(passport.initialize())
app.use(passport.session())

// Serve arquivos de música
app.use('/music', express.static(path.join(__dirname, '../public/music')))

// Serve arquivos estáticos do build em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/socket.io') && !req.path.startsWith('/auth') && !req.path.startsWith('/music')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'))
    }
  })
}

// Rotas de autenticação
app.get('/auth/google', (req, res, next) => {
  console.log('🔍 Rota /auth/google acessada')
  console.log('🔑 CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'OK' : 'MISSING')
  console.log('🔐 CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'OK' : 'MISSING')
  next()
}, passport.authenticate('google', {
  scope: ['profile', 'email']
}))

app.get('/auth/google/callback', 
  (req, res, next) => {
    console.log('🔄 Callback do Google recebido')
    next()
  },
  passport.authenticate('google', { failureRedirect: '/auth/error' }),
  (req, res) => {
    console.log('✅ Login bem-sucedido, redirecionando...')
    // Redireciona para a página principal após login
    const redirectUrl = process.env.NODE_ENV === 'production' 
      ? 'https://radio-funk-2025.onrender.com'
      : 'http://localhost:5173'
    res.redirect(redirectUrl)
  }
)

app.get('/auth/user', (req, res) => {
  if (req.user) {
    res.json({ user: req.user, authenticated: true })
  } else {
    res.json({ authenticated: false })
  }
})

app.get('/auth/listeners', async (req, res) => {
  try {
    const listeners = await User.find({}, 'name picture listeningTime lastLogin')
      .sort({ listeningTime: -1 })
      .limit(20)
    res.json({ listeners })
  } catch (error) {
    console.error('Erro ao buscar ouvintes:', error)
    res.json({ listeners: [] })
  }
})

app.post('/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true })
  })
})

app.post('/auth/update-time', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' })
  }
  
  try {
    const { listeningTime } = req.body
    const user = await User.findOne({ googleId: req.user.googleId })
    
    if (user) {
      user.listeningTime = listeningTime
      await user.save()
      console.log('💾 Tempo salvo no DB para', user.name, ':', listeningTime, 'segundos')
      res.json({ success: true, listeningTime })
    } else {
      res.status(404).json({ error: 'Usuário não encontrado' })
    }
  } catch (error) {
    console.error('Erro ao salvar tempo:', error)
    res.status(500).json({ error: 'Erro interno' })
  }
})

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Funk Radio Server funcionando!', status: 'ok' })
})

const server = createServer(app)
const io = new Server(server, {
  cors: { origin: "*" }
})

const MUSIC_DIR = '../public/music'
let playlist = []
let currentTrack = 0
let listeners = 0

// Carrega playlist com metadados
async function loadPlaylist() {
  try {
    const files = fs.readdirSync(MUSIC_DIR)
    const mp3Files = files.filter(file => file.endsWith('.mp3'))
    
    playlist = await Promise.all(
      mp3Files.map(async (file, index) => {
        const filePath = path.join(MUSIC_DIR, file)
        let cover = null
        let title = file.replace('.mp3', '')
        let artist = null
        let duration = null
        
        try {
          const metadata = await parseFile(filePath)
          title = metadata.common.title || title
          artist = metadata.common.artist || metadata.common.albumartist || metadata.common.artists?.[0] || null
          duration = metadata.format.duration
          console.log(`🎤 ${file}: titulo=${title}, artista=${artist}, duração=${Math.floor(duration)}s`)
          console.log(`📋 Metadados disponiveis:`, Object.keys(metadata.common))
          
          // Extrair capa dos metadados
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0]
            // Limitar tamanho da imagem (max 500KB)
            if (picture.data.length < 500000) {
              const base64 = Buffer.from(picture.data).toString('base64')
              cover = `data:${picture.format};base64,${base64}`
              console.log(`🇺️ Capa encontrada para ${file}: ${picture.format} (${Math.round(picture.data.length/1024)}KB)`)
            } else {
              console.log(`⚠️ Capa muito grande para ${file}: ${Math.round(picture.data.length/1024)}KB`)
            }
          } else {
            console.log(`❌ Nenhuma capa encontrada para ${file}`)
          }
        } catch (metaError) {
          console.log(`⚠️ Erro ao ler metadados de ${file}:`, metaError.message)
        }
        
        return {
          id: index + 1,
          title,
          artist,
          src: `/music/${file}`,
          file: file,
          cover,
          duration: duration || 180 // fallback só se realmente não tiver
        }
      })
    )
    
    console.log(`📻 Playlist carregada: ${playlist.length} músicas`)
  } catch (error) {
    console.log('❌ Erro ao carregar playlist:', error.message)
  }
}

let trackStartTime = Date.now()
let currentTrackTimer = null

// Mudança de música baseada na duração real
function nextTrack() {
  if (playlist.length > 0) {
    // Limpa timer anterior se existir
    if (currentTrackTimer) {
      clearTimeout(currentTrackTimer)
    }
    
    currentTrack = (currentTrack + 1) % playlist.length
    trackStartTime = Date.now()
    const track = playlist[currentTrack]
    const durationMs = track.duration * 1000
    
    console.log(`🎵 Tocando: ${track.title} (${Math.floor(track.duration)}s)`)
    
    // Envia nova música para todos
    io.emit('track-change', {
      track,
      listeners,
      startTime: trackStartTime,
      serverTime: Date.now()
    })
    
    // Agenda próxima música na duração completa
    currentTrackTimer = setTimeout(nextTrack, durationMs)
    console.log(`⏰ Próxima música em ${Math.floor(durationMs/1000)}s`)
  }
}

// Calcula posição atual da música
function getCurrentPosition() {
  if (playlist.length === 0) return 0
  const elapsed = Date.now() - trackStartTime
  const currentDuration = playlist[currentTrack].duration
  return Math.min(elapsed / 1000, currentDuration)
}

// Conexões WebSocket
io.on('connection', (socket) => {
  listeners++
  console.log(`👤 Ouvinte conectado (${listeners} online)`)
  
  // Envia estado atual com posição da música
  if (playlist.length > 0) {
    const position = getCurrentPosition()
    console.log(`👤 Novo ouvinte conectou na posição ${Math.floor(position)}s`)
    socket.emit('radio-state', {
      track: playlist[currentTrack],
      listeners,
      startTime: trackStartTime,
      currentPosition: position,
      serverTime: Date.now()
    })
  }
  
  // Atualiza contador para todos
  io.emit('listeners-update', listeners)
  
  socket.on('get-current-state', () => {
    if (playlist.length > 0) {
      socket.emit('radio-state', {
        track: playlist[currentTrack],
        listeners,
        startTime: trackStartTime,
        currentPosition: getCurrentPosition(),
        serverTime: Date.now()
      })
    }
  })
  
  socket.on('sync-position', () => {
    console.log('📶 Recebeu pedido de sync-position')
    if (playlist.length > 0) {
      const position = getCurrentPosition()
      console.log(`🔄 Enviando sync-time na posição ${Math.floor(position)}s`)
      socket.emit('sync-time', {
        currentPosition: position,
        serverTime: Date.now()
      })
    } else {
      console.log('❌ Playlist vazia, não pode sincronizar')
    }
  })
  
  socket.on('disconnect', () => {
    listeners--
    console.log(`👤 Ouvinte desconectou (${listeners} online)`)
    io.emit('listeners-update', listeners)
  })
})

// Inicia servidor
await loadPlaylist()
if (playlist.length > 0) {
  trackStartTime = Date.now()
  const firstTrack = playlist[currentTrack]
  console.log(`🎵 Iniciando stream: ${firstTrack.title} (${Math.floor(firstTrack.duration)}s)`)
  
  // Agenda primeira troca na duração completa
  const firstDelay = firstTrack.duration * 1000
  currentTrackTimer = setTimeout(nextTrack, firstDelay)
  console.log(`⏰ Primeira troca em ${Math.floor(firstDelay/1000)}s`)
}

const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de streaming rodando na porta ${PORT}`)
  console.log('🎵 Rádio tocando automaticamente!')
})

// Músicas agora trocam automaticamente baseadas na duração real