import { useState } from 'react'
import { FaGoogle } from 'react-icons/fa'
import './LoginModal.css'

function LoginModal({ isOpen, onClose }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = () => {
    setIsLoading(true)
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001'
    
    // Abre popup para OAuth
    const popup = window.open(
      `${serverUrl}/auth/google`,
      'google-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    )
    
    // Monitora o popup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        setIsLoading(false)
        onClose()
        // Recarrega página após login para resetar estado
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-soft">
        <p className="login-text">Entre de graça para ter acesso à recursos exclusivos</p>
        
        <button 
          className="google-btn-minimal"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <FaGoogle />
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

export default LoginModal