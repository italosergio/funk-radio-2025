import { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import { HiPlay, HiPause, HiVolumeUp, HiVolumeOff, HiUsers, HiDownload } from 'react-icons/hi'
import { FaGoogle } from 'react-icons/fa'
import RadioStream from './RadioStream.js'
import WaveVisualizer from './components/WaveVisualizer.jsx'
import LoginModal from './components/LoginModal.jsx'
import UserProfile from './components/UserProfile.jsx'
import ListenersModal from './components/ListenersModal.jsx'
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
  const audioRef = useRef(null)
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [listeningTime, setListeningTime] = useState(0)
  const listeningIntervalRef = useRef(null)

  const { t, language, changeLanguage } = useTranslation()

  const checkAuth = async () => {
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      const response = await fetch(`${serverUrl}/auth/user`, { credentials: 'include' })
      const data = await response.json()
      if (data.authenticated) {
        setUser(data.user)
        setListeningTime(data.user.listeningTime || 0)
        console.log('👤 Usuário logado:', data.user)
        console.log('⏱️ Tempo inicial:', data.user.listeningTime || 0, 'segundos')
        
        // Força timer a iniciar após login (ignora estado de mute)
        console.log('🚀 Forçando timer após login')
        setTimeout(() => startListeningTimer(), 1000)
        
        // Solicita sincronização após login
        if (socketRef.current && radioStarted) {
          console.log('🔄 Solicitando sincronização após login')
          socketRef.current.emit('sync-position')
        }
      } else {
        // Usuário deslogado - para timer
        setUser(null)
        stopListeningTimer()
      }
    } catch (error) {
      console.log('Erro ao verificar autenticação:', error)
    }
  }

  const startListeningTimer = () => {
    console.log('🔍 Tentando iniciar timer - user:', !!user, 'timer existe:', !!listeningIntervalRef.current)
    if (user && !listeningIntervalRef.current) {
      console.log('▶️ Iniciando timer de escuta para:', user.name)
      listeningIntervalRef.current = setInterval(() => {
        setListeningTime(prev => {
          const newTime = prev + 1
          saveListeningTime(newTime)
          return newTime
        })
      }, 1000)
    } else if (!user) {
      console.log('⚠️ Não pode iniciar timer - usuário não logado')
    } else if (listeningIntervalRef.current) {
      console.log('⚠️ Timer já está rodando')
    }
  }

  const stopListeningTimer = () => {
    if (listeningIntervalRef.current) {
      console.log('⏸️ Parando timer de escuta')
      clearInterval(listeningIntervalRef.current)
      listeningIntervalRef.current = null
      // Salva tempo final
      saveListeningTime(listeningTime)
    }
  }

  const saveListeningTime = async (time) => {
    if (!user) return
    
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      
      await fetch(`${serverUrl}/auth/update-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ listeningTime: time })
      })
    } catch (error) {
      console.error('Erro ao salvar tempo:', error)
    }
  }

  const [showListenersModal, setShowListenersModal] = useState(false)



  const handleUserAvatarClick = (selectedUser) => {
    console.log('Clicou no usuário:', selectedUser)
  }



  useEffect(() => {
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001'
    socketRef.current = io(serverUrl)
    
    socketRef.current.on('connect', () => {
      setConnected(true)
    })
    
    socketRef.current.on('radio-state', async (data) => {
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(data.currentPosition)
      
      // Se já iniciou, carrega e toca
      if (radioStarted && streamRef.current) {
        await streamRef.current.loadTrack(data.track.src)
        await streamRef.current.play(data.currentPosition)
        
        // Aplicar estado de mute se necessário
        if (isMuted) {
          streamRef.current.mute()
        }
      }
    })
    
    socketRef.current.on('track-change', async (data) => {
      setCurrentTrack(data.track)
      setListeners(data.listeners)
      setServerPosition(0)
      
      if (streamRef.current) {
        try {
          const loaded = await streamRef.current.loadTrack(data.track.src)
          if (loaded) {
            const played = await streamRef.current.play(0)
            if (played) {
              updateMediaSession(data.track)
              
              if (isMuted && streamRef.current) {
                streamRef.current.mute()
              }
              
              if (audioRef.current) {
                audioRef.current.currentTime = 0
                if (!isMuted) {
                  audioRef.current.play().catch(() => {})
                } else {
                  audioRef.current.pause()
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao trocar música:', error)
        }
      }
    })
    
    socketRef.current.on('listeners-update', (count) => {
      setListeners(count)
    })
    
    socketRef.current.on('sync-time', async (data) => {
      setServerPosition(data.currentPosition)
      if (streamRef.current && radioStarted && currentTrack) {
        if (!streamRef.current.audioBuffer) {
          await streamRef.current.loadTrack(currentTrack.src)
        }
        await streamRef.current.play(data.currentPosition)
      }
    })
    
    return () => socketRef.current?.disconnect()
  }, [])

  useEffect(() => {
    checkAuth()
    
    // Listener para quando usuário faz login
    const handleUserLogin = () => {
      console.log('🔄 Evento userLoggedIn recebido')
      console.log('📊 Estado atual - radioStarted:', radioStarted, 'isMuted:', isMuted)
      setTimeout(() => {
        checkAuth()
        // Força timer após login
        console.log('🚀 Forçando timer no evento userLoggedIn')
        setTimeout(() => startListeningTimer(), 1000)
        
        // Força sincronização após login
        if (socketRef.current && radioStarted) {
          console.log('📡 Emitindo sync-position após login')
          socketRef.current.emit('sync-position')
        }
      }, 500)
    }
    
    window.addEventListener('userLoggedIn', handleUserLogin)
    
    // Listener para logout
    const handleUserLogout = () => {
      console.log('🚪 Evento userLoggedOut recebido')
      setUser(null)
      setListeningTime(0)
      stopListeningTimer()
    }
    
    // Listener para teste manual
    const handleStartTimer = () => {
      console.log('🔴 Botão teste clicado - forçando timer')
      startListeningTimer()
    }
    
    window.addEventListener('userLoggedIn', handleUserLogin)
    window.addEventListener('userLoggedOut', handleUserLogout)
    window.addEventListener('startTimer', handleStartTimer)
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin)
      window.removeEventListener('userLoggedOut', handleUserLogout)
      window.removeEventListener('startTimer', handleStartTimer)
    }
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
      
      // Aplicar estado de mute se necessário
      if (isMuted) {
        streamRef.current.mute()
      } else {
        // Inicia timer se usuário logado e música tocando
        if (user) {
          startListeningTimer()
        }
      }
      
      setupMediaSession()
      updateMediaSession(currentTrack)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      streamRef.current.unmute()
      setIsMuted(false)
      if (audioRef.current) {
        audioRef.current.volume = 0.01
        audioRef.current.play().catch(() => {})
      }
      startListeningTimer()
    } else {
      streamRef.current.mute()
      setIsMuted(true)
      if (audioRef.current) {
        audioRef.current.volume = 0.01
        audioRef.current.pause()
      }
      stopListeningTimer()
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

  const setupMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('📱 Botão play pressionado na tela de bloqueio')
        console.log('🔊 Estado atual isMuted:', isMuted)
        
        if (audioRef.current) {
          audioRef.current.volume = 0.01
          audioRef.current.play()
        }
        
        if (streamRef.current) {
          streamRef.current.unmute()
          setIsMuted(false)
          console.log('✅ Desmutado via player externo')
        }
      })
      
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('📱 Botão pause pressionado na tela de bloqueio')
        console.log('🔇 Estado atual isMuted:', isMuted)
        
        if (audioRef.current) {
          audioRef.current.volume = 0.01
          audioRef.current.pause()
        }
        
        if (streamRef.current) {
          streamRef.current.mute()
          setIsMuted(true)
          console.log('✅ Mutado via player externo')
        }
      })
      
      // Desabilitar controles de posição para remover barra de progresso
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
      navigator.mediaSession.setActionHandler('seekto', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }

  const updateMediaSession = (track) => {
    if ('mediaSession' in navigator && audioRef.current) {
      // Configura o audio element oculto (volume baixo)
      audioRef.current.src = track.src
      audioRef.current.currentTime = serverPosition
      audioRef.current.volume = 0.01
      
      // Respeita estado de mute atual
      if (!isMuted) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Funk Radio',
        album: 'Funk Radio 2025',
        artwork: track.cover ? [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }] : []
      })
    }
  }



  if (!connected || !currentTrack || !radioStarted) {
    return (
      <div className="opening-screen">
        {/* Tesseract de fundo da tela inteira */}
        <div className="opening-tesseract"></div>
        
        <div className="opening-content">
          <div className="opening-logo">FUNK RADIO</div>
          <div className="opening-year">2025</div>
          
          {/* Mensagem de boas-vindas se logado */}
          {user && (
            <div className="opening-welcome">
              Bem-vindo, {user.given_name || user.name}!
            </div>
          )}
          
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
        
        {/* Botão de login após apresentação */}
        {!user && connected && currentTrack && (
          <div className="opening-login-bottom">
            <button 
              onClick={() => {
                const serverUrl = process.env.NODE_ENV === 'production' 
                  ? window.location.origin 
                  : 'http://localhost:3001'
                window.location.href = `${serverUrl}/auth/google`
              }} 
              className="opening-login-btn"
            >
              <FaGoogle />
              Entrar
            </button>
          </div>
        )}
        
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)} 
        />
      </div>
    )
  }

  return (
    <div className="radio-app">
      {/* Audio element oculto para Media Session API */}
      <audio 
        ref={audioRef}
        style={{ display: 'none' }}
        preload="none"
        volume={0.01}
        onPlay={() => console.log('Audio element playing')}
        onPause={() => console.log('Audio element paused')}
        onLoadedMetadata={() => {
          // Remove duração para evitar barra de progresso
          if (audioRef.current) {
            Object.defineProperty(audioRef.current, 'duration', {
              value: Infinity,
              writable: false
            })
          }
        }}
      />
      
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
        {user ? (
          <div className="user-avatar-small" onClick={() => setShowUserProfile(true)}>
            {user.picture ? (
              <img src={user.picture} alt={user.name} />
            ) : (
              <div className="avatar-placeholder-small">{user.name?.charAt(0)}</div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => {
              const serverUrl = process.env.NODE_ENV === 'production' 
                ? window.location.origin 
                : 'http://localhost:3001'
              window.location.href = `${serverUrl}/auth/google`
            }} 
            className="login-btn-top"
          >
            <FaGoogle />
            Entrar
          </button>
        )}
      </div>

      <div className="radio-container">
        <div className="logo">{t('appName')}</div>
        

        
        <div className="music-info">
          <div className="album-cover">
            {currentTrack?.cover ? (
              <img 
                src={currentTrack.cover} 
                alt={`${currentTrack.title} cover`}

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
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
      
      <UserProfile 
        user={user}
        listeningTime={listeningTime}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
      
      <ListenersModal 
        isOpen={showListenersModal}
        onClose={() => setShowListenersModal(false)}
        onUserClick={handleUserAvatarClick}
      />
    </div>
  )
}

export default App