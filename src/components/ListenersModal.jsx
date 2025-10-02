import { useState, useEffect } from 'react'
import { HiUsers, HiX } from 'react-icons/hi'
import './ListenersModal.css'

function ListenersModal({ isOpen, onClose, onUserClick }) {
  const [listeners, setListeners] = useState([])

  useEffect(() => {
    if (isOpen) {
      fetchListeners()
    }
  }, [isOpen])

  const fetchListeners = async () => {
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      const response = await fetch(`${serverUrl}/auth/listeners`, { credentials: 'include' })
      const data = await response.json()
      setListeners(data.listeners || [])
    } catch (error) {
      console.error('Erro ao buscar ouvintes:', error)
    }
  }

  const formatListeningTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  if (!isOpen) return null

  return (
    <div className="listeners-modal-overlay" onClick={onClose}>
      <div className="listeners-modal" onClick={e => e.stopPropagation()}>
        <div className="listeners-header">
          <div className="listeners-title">
            <HiUsers />
            Ouvintes Online ({listeners.length})
          </div>
          <button className="close-btn" onClick={onClose}>
            <HiX />
          </button>
        </div>
        
        <div className="listeners-list">
          {listeners.map((listener, index) => (
            <div 
              key={listener.googleId || index} 
              className="listener-item"
              onClick={() => onUserClick(listener)}
            >
              <div className="listener-avatar">
                {listener.picture ? (
                  <img src={listener.picture} alt={listener.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {listener.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              
              <div className="listener-info">
                <div className="listener-name">{listener.name}</div>
                <div className="listener-time">
                  {formatListeningTime(listener.listeningTime || 0)}
                </div>
              </div>
            </div>
          ))}
          
          {listeners.length === 0 && (
            <div className="no-listeners">
              Nenhum ouvinte logado no momento
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ListenersModal