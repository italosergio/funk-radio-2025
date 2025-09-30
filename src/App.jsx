import { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import RadioStream from './RadioStream.js'
import './App.css'

function App() {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [radioStarted, setRadioStarted] = useState(false)
  const [listeners, setListeners] = useState(0)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const streamRef = useRef(null)
  const [serverPosition, setServerPosition] = useState(0)

  useEffect(() => {
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001'
    socketRef.current = io(serverUrl)
    
    socketRef.current.on('connect', () => {
      setConnected(true)
      console.log('📻 Conectado ao servidor')
    })
    
    socketRef.current.on('radio-state', async (data) => {
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(data.currentPosition)
      
      // Se já iniciou, carrega e toca
      if (radioStarted && streamRef.current) {
        await streamRef.current.loadTrack(data.track.src)
        streamRef.current.play(data.currentPosition)
      }
    })
    
    socketRef.current.on('track-change', async (data) => {
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(0)
      
      if (radioStarted && streamRef.current) {
        await streamRef.current.loadTrack(data.track.src)
        streamRef.current.play(0)
      }
    })
    
    socketRef.current.on('listeners-update', (count) => {
      setListeners(count)
    })
    
    socketRef.current.on('sync-time', async (data) => {
      console.log('🔄 Recebeu sync-time:', Math.floor(data.currentPosition))
      setServerPosition(data.currentPosition)
      if (streamRef.current && radioStarted && currentTrack) {
        console.log('🎵 Reconectando stream...')
        
        if (!streamRef.current.audioBuffer) {
          await streamRef.current.loadTrack(currentTrack.src)
        }
        
        streamRef.current.play(data.currentPosition)
        console.log('✅ Stream reconectado!')
      }
    })
    
    return () => socketRef.current?.disconnect()
  }, [])

  const startRadio = async () => {
    setRadioStarted(true)
    
    // Inicializa Web Audio API
    streamRef.current = new RadioStream()
    await streamRef.current.init()
    
    // Carrega e toca na posição atual
    if (currentTrack) {
      await streamRef.current.loadTrack(currentTrack.src)
      streamRef.current.play(serverPosition)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      streamRef.current.unmute()
      setIsMuted(false)
    } else {
      streamRef.current.mute()
      setIsMuted(true)
    }
  }



  if (!connected) {
    return (
      <div className="radio-app">
        <h1>🎵 Rádio Funk 2025</h1>
        <div className="player">
          <p>Conectando ao servidor...</p>
        </div>
      </div>
    )
  }

  if (!currentTrack) {
    return (
      <div className="radio-app">
        <h1>🎵 Rádio Funk 2025</h1>
        <div className="player">
          <p>Aguardando programação...</p>
        </div>
      </div>
    )
  }

  if (!radioStarted) {
    return (
      <div className="radio-app">
        <h1>🎵 Rádio Funk 2025</h1>
        <div className="player">
          <div className="start-screen">
            <h2>Pronto para começar?</h2>
            <button onClick={startRadio} className="start-btn">
              ▶️ Iniciar Rádio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="radio-app">
      <h1>🎵 Rádio Funk 2025</h1>
      
      <div className="player">
        <div className="streaming-info">
          <div className="live-indicator">
            <span className="live-dot"></span>
            AO VIVO
          </div>
          <div className="listeners">
            👥 {listeners} ouvintes
          </div>
        </div>

        <div className="track-info">
          <h2>{currentTrack.title}</h2>
          <p>{currentTrack.artist}</p>
        </div>

        {/* Web Audio API - sem elemento HTML */}

        <div className="controls">
          <button onClick={toggleMute} className="play-btn">
            {isMuted ? '🔊 Ativar Som' : '🔇 Mutar'}
          </button>
        </div>

        <div className="playlist">
          <h3>🎵 Rádio Funk 2025 - AO VIVO</h3>
          <div className="now-playing">
            <strong>TOCANDO AGORA:</strong> {currentTrack.title} - {currentTrack.artist}
          </div>
          <div className="stream-info">
            <p>📡 Streaming em tempo real</p>
            <p>🔄 Música muda automaticamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App