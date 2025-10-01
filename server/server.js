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
          const duration = metadata.format.duration || 180 // fallback 3 minutos
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
          duration: duration || 180
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
    
    // Agenda próxima música 1s antes do fim para crossfade suave
    const nextTrackDelay = Math.max(durationMs - 1000, 1000)
    currentTrackTimer = setTimeout(nextTrack, nextTrackDelay)
    console.log(`⏰ Próxima música em ${Math.floor(nextTrackDelay/1000)}s (crossfade)`)
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
  
  // Agenda primeira troca com crossfade
  const firstDelay = Math.max(firstTrack.duration * 1000 - 1000, 1000)
  currentTrackTimer = setTimeout(nextTrack, firstDelay)
  console.log(`⏰ Primeira troca em ${Math.floor(firstDelay/1000)}s (crossfade)`)
}

const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de streaming rodando na porta ${PORT}`)
  console.log('🎵 Rádio tocando automaticamente!')
})

// Músicas agora trocam automaticamente baseadas na duração real