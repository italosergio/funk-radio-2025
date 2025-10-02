import { useEffect, useState } from 'react'
import { FaSignOutAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import './UserProfile.css'

function UserProfile({ user, listeningTime, isOpen, onClose }) {
  const [currentTime, setCurrentTime] = useState(listeningTime)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showInListeners, setShowInListeners] = useState(true)
  
  useEffect(() => {
    setCurrentTime(listeningTime)
  }, [listeningTime])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatListeningTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}min ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleLogout = async () => {
    try {
      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      await fetch(`${serverUrl}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      })
      window.location.reload()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={e => e.stopPropagation()}>
        <div className="user-avatar">
          {user.picture ? (
            <img src={user.picture} alt={user.name} />
          ) : (
            <div className="avatar-placeholder">{user.name?.charAt(0)}</div>
          )}
        </div>
        
        <div className="user-info">
          <h3>{user.name}</h3>
          <p className="user-email">{user.email}</p>
          
          <div className="user-details">
            <div className="detail-centered">
              <span className="label-centered">Tempo de escuta</span>
              <span className="value-centered">{formatListeningTime(currentTime)}</span>
            </div>
          </div>
          
          <div className="advanced-section">
            <button 
              className="advanced-toggle" 
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Avançado {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            
            {showAdvanced && (
              <div className="advanced-content">
                <div className="detail-item">
                  <span className="label">Membro desde</span>
                  <span className="value">{formatDate(user.createdAt)}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">Último acesso</span>
                  <span className="value">{formatDateTime(user.lastLogin)}</span>
                </div>
                
                <div className="setting-item">
                  <span className="setting-label">Aparecer na lista</span>
                  <select 
                    className="setting-select"
                    value={showInListeners ? 'sim' : 'nao'}
                    onChange={(e) => setShowInListeners(e.target.value === 'sim')}
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile