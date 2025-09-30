import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import fs from 'fs'
import path from 'path'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: { origin: "*" }
})

const MUSIC_DIR = '../public/music'
let playlist = []
let currentTrack = 0
let listeners = 0

// Carrega playlist
function loadPlaylist() {
  try {
    const files = fs.readdirSync(MUSIC_DIR)
    playlist = files
      .filter(file => file.endsWith('.mp3'))
      .map((file, index) => ({
        id: index + 1,
        title: file.replace('.mp3', '').replace(/^.*? - /, ''),
        artist: file.includes(' - ') ? file.split(' - ')[0] : 'Artista',
        src: `/music/${file}`,
        file: file
      }))
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
    console.log(`🎵 Tocando: ${track.title} - ${track.artist}`)
    
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
loadPlaylist()
if (playlist.length > 0) {
  trackStartTime = Date.now()
  console.log(`🎵 Iniciando stream: ${playlist[currentTrack].title} - ${playlist[currentTrack].artist}`)
}

server.listen(3001, () => {
  console.log('🚀 Servidor de streaming rodando na porta 3001')
  console.log('🎵 Rádio tocando automaticamente!')
})

// Simula troca de música a cada 3 minutos
setInterval(nextTrack, trackDuration)