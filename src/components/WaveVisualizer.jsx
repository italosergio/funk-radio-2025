import { useEffect, useRef, useState } from 'react'
import { HiSwitchHorizontal } from 'react-icons/hi'

const WaveVisualizer = ({ radioStream, isPlaying }) => {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const [effectType, setEffectType] = useState(() => {
    const saved = localStorage.getItem('radioEffectType')
    return saved ? parseInt(saved) : 1
  })
  const [is3D, setIs3D] = useState(() => {
    const saved = localStorage.getItem('radioIs3D')
    return saved ? JSON.parse(saved) : false
  })
  
  const effectNames = [
    '2D Simétricas', '2D Centralizadas', '2D Circulares',
    '3D Onduladas', '3D Estáticas', '3D Rotativas'
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    
    const draw = () => {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      if (!radioStream || !isPlaying) {
        const bgOpacity = 0.03
        ctx.fillStyle = `rgba(255, 255, 255, ${bgOpacity})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        animationRef.current = requestAnimationFrame(draw)
        return
      }
      
      const analyser = radioStream.getAnalyser()
      
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.getByteFrequencyData(dataArray)
        
        const bassRange = Math.floor(bufferLength * 0.1)
        let bassIntensity = 0
        for (let i = 0; i < bassRange; i++) {
          bassIntensity += dataArray[i]
        }
        bassIntensity = Math.min((bassIntensity / bassRange) / 255, 1)
        
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const time = Date.now() * 0.002
        
        // Background suave
        const bgOpacity = bassIntensity * 0.03
        ctx.fillStyle = `rgba(255, 255, 255, ${bgOpacity})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        if (is3D) {
          // EFEITOS 3D CENTRAIS
          if (effectType === 0) {
            // Barras 3D com movimento ondulado
            const barCount = 20
            const barWidth = canvas.width / barCount
            const maxHeight = bassIntensity * 200 + 100
            const depth = bassIntensity * 30 + 15
            const opacity = bassIntensity * 0.6 + 0.4
            
            for (let i = 0; i < barCount; i++) {
              const x = i * barWidth
              const barHeight = Math.abs(Math.sin(time + i * 0.5)) * maxHeight + 20
              const y = centerY - barHeight / 2
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(x, y, barWidth - 2, barHeight)
              
              const offsetX = depth
              const offsetY = -depth * 0.5
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`
              ctx.beginPath()
              ctx.moveTo(x + barWidth - 2, y)
              ctx.lineTo(x + barWidth - 2 + offsetX, y + offsetY)
              ctx.lineTo(x + barWidth - 2 + offsetX, y + barHeight + offsetY)
              ctx.lineTo(x + barWidth - 2, y + barHeight)
              ctx.closePath()
              ctx.fill()
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x + offsetX, y + offsetY)
              ctx.lineTo(x + barWidth - 2 + offsetX, y + offsetY)
              ctx.lineTo(x + barWidth - 2, y)
              ctx.closePath()
              ctx.fill()
            }
          } else if (effectType === 1) {
            // Barras 3D estáticas - graves no centro, agudos nas bordas
            const barCount = 20
            const barWidth = canvas.width / barCount
            const depth = bassIntensity * 30 + 15
            const opacity = bassIntensity * 0.6 + 0.4
            
            for (let i = 0; i < barCount; i++) {
              // Reorganizar: graves (baixas frequências) no centro
              let freqIndex
              if (i < barCount / 2) {
                // Lado esquerdo: agudos nas bordas, graves no centro
                freqIndex = barCount - 1 - i
              } else {
                // Lado direito: agudos nas bordas, graves no centro  
                freqIndex = i
              }
              
              const x = centerX - (barCount * barWidth) / 2 + i * barWidth
              const intensity = (dataArray[freqIndex] || 0) / 255
              const barHeight = Math.max(intensity * canvas.height * 0.6, 20)
              const y = centerY - barHeight / 2
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(x, y, barWidth - 2, barHeight)
              
              const offsetX = depth
              const offsetY = -depth * 0.5
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`
              ctx.beginPath()
              ctx.moveTo(x + barWidth - 2, y)
              ctx.lineTo(x + barWidth - 2 + offsetX, y + offsetY)
              ctx.lineTo(x + barWidth - 2 + offsetX, y + barHeight + offsetY)
              ctx.lineTo(x + barWidth - 2, y + barHeight)
              ctx.closePath()
              ctx.fill()
            }
          } else if (effectType === 2) {
            // Barras 3D rotativas
            const barCount = 16
            const radius = 180
            const depth = bassIntensity * 30 + 20
            const opacity = bassIntensity * 0.6 + 0.4
            
            for (let i = 0; i < barCount; i++) {
              const angle = (i / barCount) * Math.PI * 2 + time * 0.5
              const intensity = (dataArray[i] || 0) / 255
              const barHeight = Math.max(intensity * 150 + 40, 20)
              
              const x = centerX + Math.cos(angle) * radius
              const y = centerY + Math.sin(angle) * radius
              
              ctx.save()
              ctx.translate(x, y)
              ctx.rotate(angle + Math.PI / 2)
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(-6, -barHeight / 2, 12, barHeight)
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.6})`
              ctx.fillRect(6, -barHeight / 2, depth, barHeight)
              
              ctx.restore()
            }
          }
        } else {
          // EFEITOS 2D ORIGINAIS
          if (effectType === 0) {
            // Barras simétricas - graves nas bordas, agudos no centro
            const totalBars = 35
            const barSpacing = canvas.width / totalBars
            const barWidth = barSpacing * 0.8
            
            for (let i = 0; i < totalBars; i++) {
              const intensity = (dataArray[i] / 255) * 1
              const maxHeightRatio = i < totalBars * 0.3 ? 0.7 : 0.6
              const barHeight = Math.max(intensity * canvas.height * maxHeightRatio, 8)
              
              const xLeft = i * barSpacing
              const xRight = canvas.width - (i + 1) * barSpacing
              const y = canvas.height - barHeight
              const opacity = Math.max(intensity * 0.9 + 0.1, 0.5)
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(xLeft, y, barWidth, barHeight)
              ctx.fillRect(xRight, y, barWidth, barHeight)
            }
          } else if (effectType === 1) {
            // Barras centralizadas - graves no centro, agudos nas bordas
            const totalBars = 35
            const barSpacing = canvas.width / totalBars
            const barWidth = barSpacing * 0.8
            
            for (let i = 0; i < totalBars; i++) {
              // Reorganizar: graves (baixas frequências) no centro
              let freqIndex
              if (i < totalBars / 2) {
                // Lado esquerdo: agudos nas bordas, graves no centro
                freqIndex = totalBars - 1 - i
              } else {
                // Lado direito: agudos nas bordas, graves no centro  
                freqIndex = i
              }
              
              const intensity = (dataArray[freqIndex] / 255) * 1
              const barHeight = Math.max(intensity * canvas.height * 0.6, 8)
              
              const x = centerX - (totalBars * barSpacing) / 2 + i * barSpacing
              const y = centerY - barHeight / 2
              const opacity = Math.max(intensity * 0.9 + 0.1, 0.5)
              
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.fillRect(x, y, barWidth, barHeight)
            }
          } else if (effectType === 2) {
            // Barras circulares
            const totalBars = 35
            const radius = 150
            
            for (let i = 0; i < totalBars; i++) {
              const intensity = (dataArray[i] / 255) * 1
              const barHeight = Math.max(intensity * 100 + 20, 8)
              
              const angle = (i / totalBars) * Math.PI * 2
              const x1 = centerX + Math.cos(angle) * radius
              const y1 = centerY + Math.sin(angle) * radius
              const x2 = centerX + Math.cos(angle) * (radius + barHeight)
              const y2 = centerY + Math.sin(angle) * (radius + barHeight)
              
              const opacity = Math.max(intensity * 0.9 + 0.1, 0.5)
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`
              ctx.lineWidth = 3
              ctx.beginPath()
              ctx.moveTo(x1, y1)
              ctx.lineTo(x2, y2)
              ctx.stroke()
            }
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [radioStream, isPlaying, effectType, is3D])

  const handleClick = () => {
    // Não usado mais - efeitos mudados pelo botão
  }
  
  const changeEffect = () => {
    const currentIndex = is3D ? effectType + 3 : effectType
    const nextIndex = (currentIndex + 1) % 6
    
    if (nextIndex < 3) {
      setIs3D(false)
      setEffectType(nextIndex)
      localStorage.setItem('radioIs3D', 'false')
      localStorage.setItem('radioEffectType', nextIndex.toString())
    } else {
      setIs3D(true)
      setEffectType(nextIndex - 3)
      localStorage.setItem('radioIs3D', 'true')
      localStorage.setItem('radioEffectType', (nextIndex - 3).toString())
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="background-canvas"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
      <button 
        onClick={changeEffect}
        className="effect-btn"
      >
        <HiSwitchHorizontal />
        <span className="effect-name">{effectNames[is3D ? effectType + 3 : effectType]}</span>
      </button>
    </>
  )
}

export default WaveVisualizer