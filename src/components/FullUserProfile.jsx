import { useState } from 'react'
import { HiX, HiEye, HiEyeOff } from 'react-icons/hi'
import { FaSignOutAlt } from 'react-icons/fa'
import './FullUserProfile.css'

function FullUserProfile({ user, isOpen, onClose }) {
  const [showInListeners, setShowInListeners] = useState(true)
  const [allowDataCollection, setAllowDataCollection] = useState(true)

  const formatDate = (dateString) => {
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
    <div className="full-user-profile-overlay" onClick={onClose}>
      <div className="full-user-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn-full" onClick={onClose}>
          <HiX />
        </button>

        <div className="profile-header">
          <div className="profile-avatar-large">
            {user.picture ? (
              <img src={user.picture} alt={user.name} />
            ) : (
              <div className="avatar-placeholder-large">
                {user.name?.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="profile-basic-info">
            <h2>{user.name}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-label">Tempo Total de Escuta</span>
            <span className="stat-value">{formatListeningTime(user.listeningTime || 0)}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Membro desde</span>
            <span className="stat-value">{formatDate(user.createdAt)}</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-label">Último acesso</span>
            <span className="stat-value">{formatDate(user.lastLogin)}</span>
          </div>
        </div>

        <div className="profile-settings">
          <h3>Configurações</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Aparecer na lista de ouvintes</span>
              <span className="setting-desc">Outros usuários podem ver você online</span>
            </div>
            <button 
              className={`toggle-btn ${showInListeners ? 'active' : ''}`}
              onClick={() => setShowInListeners(!showInListeners)}
            >
              {showInListeners ? <HiEye /> : <HiEyeOff />}
            </button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Coleta de dados de uso</span>
              <span className="setting-desc">Permitir análise para melhorar a experiência</span>
            </div>
            <button 
              className={`toggle-btn ${allowDataCollection ? 'active' : ''}`}
              onClick={() => setAllowDataCollection(!allowDataCollection)}
            >
              {allowDataCollection ? <HiEye /> : <HiEyeOff />}
            </button>
          </div>
        </div>

        <div className="profile-actions">
          <button className="logout-btn-full" onClick={handleLogout}>
            <FaSignOutAlt />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  )
}

export default FullUserProfile