class RadioStream {
  constructor() {
    this.audioContext = null
    this.source = null
    this.gainNode = null
    this.isPlaying = false
    this.audioBuffer = null
    this.startTime = 0
    this.offsetTime = 0
  }

  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  async loadTrack(url) {
    try {
      console.log('🎵 Carregando:', url)
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      console.log('✅ Áudio carregado')
      return true
    } catch (error) {
      console.error('❌ Erro ao carregar áudio:', error)
      return false
    }
  }

  play(startPosition = 0) {
    try {
      if (!this.audioBuffer) {
        console.error('❌ Áudio não carregado')
        return false
      }

      if (this.source) {
        this.source.stop()
        this.source.disconnect()
      }

      this.source = this.audioContext.createBufferSource()
      this.source.buffer = this.audioBuffer
      this.source.connect(this.gainNode)
      this.source.loop = true
      
      const when = this.audioContext.currentTime
      this.source.start(when, startPosition)
      
      this.startTime = when
      this.offsetTime = startPosition
      this.isPlaying = true
      
      console.log(`▶️ Tocando a partir de ${Math.floor(startPosition)}s`)
      return true
    } catch (error) {
      console.error('❌ Erro ao tocar:', error)
      return false
    }
  }

  stop() {
    if (this.source && this.isPlaying) {
      this.source.stop()
      this.source.disconnect()
      this.source = null
      this.isPlaying = false
      console.log('⏹️ Stream parado')
      // NÃO limpa audioBuffer - mantém para reconexão
    }
  }

  mute() {
    if (this.gainNode) {
      this.gainNode.gain.value = 0
      console.log('🔇 Stream mutado')
    }
  }

  unmute() {
    if (this.gainNode) {
      this.gainNode.gain.value = 1
      console.log('🔊 Stream desmutado')
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.offsetTime
    return this.offsetTime + (this.audioContext.currentTime - this.startTime)
  }
}

export default RadioStream