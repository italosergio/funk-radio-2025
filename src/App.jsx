import { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import { HiPlay, HiPause, HiVolumeUp, HiVolumeOff, HiUsers, HiDownload } from 'react-icons/hi'
import RadioStream from './RadioStream.js'
import WaveVisualizer from './components/WaveVisualizer.jsx'
import { useTranslation } from './hooks/useTranslation.js'
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
  const [showOpening, setShowOpening] = useState(true)

  const { t, language, changeLanguage } = useTranslation()



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
      console.log('📡 Estado da rádio recebido:', data.track.title)
      console.log('🎤 Artista:', data.track.artist || 'Não encontrado')
      console.log('🇺️ Capa da música:', data.track.cover ? 'Presente' : 'Ausente')
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(data.currentPosition)
      
      // Se já iniciou, carrega e toca
      if (radioStarted && streamRef.current) {
        await streamRef.current.loadTrack(data.track.src)
        await streamRef.current.play(data.currentPosition)
      }
    })
    
    socketRef.current.on('track-change', async (data) => {
      console.log('🔄 Nova música recebida:', data.track.title)
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(0)
      
      // SEMPRE tenta tocar nova música, independente do estado
      if (streamRef.current) {
        try {
          console.log('🎵 Carregando nova música...')
          const loaded = await streamRef.current.loadTrack(data.track.src)
          if (loaded) {
            console.log('▶️ Forçando reprodução da nova música...')
            const played = await streamRef.current.play(0)
            if (played) {
              console.log('✅ Nova música tocando!')
              updateMediaSession(data.track)
            } else {
              console.error('❌ Falha ao tocar nova música')
            }
          } else {
            console.error('❌ Falha ao carregar música')
          }
        } catch (error) {
          console.error('❌ Erro ao trocar música:', error)
        }
      } else {
        console.error('❌ StreamRef não existe!')
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
        
        await streamRef.current.play(data.currentPosition)
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
      await streamRef.current.play(serverPosition)
      updateMediaSession(currentTrack)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      streamRef.current.unmute()
      setIsMuted(false)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    } else {
      streamRef.current.mute()
      setIsMuted(true)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    }
  }

  const downloadCurrentTrack = () => {
    if (currentTrack) {
      const link = document.createElement('a')
      link.href = currentTrack.src
      link.download = `${currentTrack.title}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const updateMediaSession = (track) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Funk Radio',
        album: 'Funk Radio 2025',
        artwork: track.cover ? [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }] : []
      })
      
      navigator.mediaSession.setActionHandler('play', () => {
        if (streamRef.current && isMuted) {
          toggleMute()
        }
      })
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (streamRef.current && !isMuted) {
          toggleMute()
        }
      })
      
      navigator.mediaSession.playbackState = isMuted ? 'paused' : 'playing'
    }
  }



  if (!connected || !currentTrack || !radioStarted) {
    return (
      <div className="opening-screen">
        <div className="opening-content">
          <div className="opening-logo">RÁDIO FUNK</div>
          <div className="opening-year">2025</div>
          {!connected ? (
            <div className="opening-status">{t('connecting')}</div>
          ) : !currentTrack ? (
            <div className="opening-status">{t('loading')}</div>
          ) : (
            <button onClick={startRadio} className="opening-play-btn">
              <HiPlay />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="radio-app">
      <div className="background-visualizer">
        <WaveVisualizer 
          radioStream={streamRef.current} 
          isPlaying={!isMuted && radioStarted}

        />
      </div>
      
      <div className="status-bar">
        <div className="live-indicator">
          <div className="live-dot"></div>
          {t('live')}
        </div>
        <div className="listeners-count">
          <HiUsers />
          {listeners} {t('listeners')}
        </div>
      </div>

      <div className="radio-container">
        <div className="logo">{t('appName')}</div>
        
        <div className="music-info">
          <div className="album-cover">
            {currentTrack?.cover ? (
              <img 
                src={currentTrack.cover} 
                alt={`${currentTrack.title} cover`}
                onLoad={() => console.log('Capa carregada com sucesso')}
                onError={() => {
                  console.log('Erro ao carregar capa')
                  console.log('URL da capa:', currentTrack.cover)
                }}
              />
            ) : (
              <div className="album-placeholder">
                🎵
                <div style={{fontSize: '0.8rem', marginTop: '10px', opacity: 0.5}}>Sem capa</div>
              </div>
            )}
          </div>

          <div className="track-info">
            <div className="track-title">{currentTrack.title}</div>
            {currentTrack.artist && (
              <div className="track-artist">{currentTrack.artist}</div>
            )}
          </div>
          
          <button className="download-btn-discrete" onClick={downloadCurrentTrack}>
            <HiDownload />
          </button>
        </div>

        <div className="controls">
          <button onClick={toggleMute} className="control-btn primary">
            {isMuted ? <HiVolumeOff /> : <HiVolumeUp />}
          </button>
        </div>

      </div>
    </div>
  )
}

export default App