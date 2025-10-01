import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseFile } from 'music-metadata'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// Serve arquivos estáticos do build
app.use(express.static(path.join(__dirname, '../dist')))
app.use('/music', express.static(path.join(__dirname, '../public/music')))

// Rota catch-all para SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/socket.io')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  }
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
        
        try {
          const metadata = await parseFile(filePath)
          title = metadata.common.title || title
          artist = metadata.common.artist || metadata.common.albumartist || metadata.common.artists?.[0] || null
          console.log(`🎤 ${file}: titulo=${title}, artista=${artist}`)
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
          cover
        }
      })
    )
    
    console.log(`📻 Playlist carregada: ${playlist.length} músicas`)
  } catch (error) {
    console.log('❌ Erro ao carregar playlist:', error.message)
  }
}

let trackStartTime = Date.now()
let trackDuration = 180000 // 3 minutos

// Simula mudança de música
function nextTrack() {
  if (playlist.length > 0) {
    currentTrack = (currentTrack + 1) % playlist.length
    trackStartTime = Date.now()
    const track = playlist[currentTrack]
    console.log(`🎵 Tocando: ${track.title}`)
    
    // Envia nova música para todos
    io.emit('track-change', {
      track,
      listeners,
      startTime: trackStartTime,
      serverTime: Date.now()
    })
  }
}

// Calcula posição atual da música
function getCurrentPosition() {
  const elapsed = Date.now() - trackStartTime
  return Math.min(elapsed / 1000, trackDuration / 1000)
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
  console.log(`🎵 Iniciando stream: ${playlist[currentTrack].title}`)
}

const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de streaming rodando na porta ${PORT}`)
  console.log('🎵 Rádio tocando automaticamente!')
})

// Simula troca de música a cada 3 minutos
setInterval(nextTrack, trackDuration)