class RadioStream {
  constructor() {
    this.audioContext = null
    this.source = null
    this.gainNode = null
    this.isPlaying = false
    this.audioBuffer = null
    this.startTime = 0
    this.offsetTime = 0
    this.nextSource = null
    this.nextGainNode = null
    this.nextAnalyser = null
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

      // Para música atual se existir
      if (this.source) {
        this.source.stop()
        this.source.disconnect()
      }

      // Sempre inicia nova música
      this.startNewTrack(startPosition)
      return true
    } catch (error) {
      console.error('❌ Erro ao tocar:', error)
      return false
    }
  }

  startNewTrack(startPosition = 0) {
    console.log('🎵 Iniciando nova música...')
    
    // Criar analyser para visualização
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.8

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = this.audioBuffer
    
    // Conectar: source -> analyser -> gainNode -> destination
    this.source.connect(this.analyser)
    this.analyser.connect(this.gainNode)
    
    // Resetar gain para 1
    this.gainNode.gain.value = 1
    
    this.source.onended = () => {
      console.log('🎵 Música terminou, aguardando próxima do servidor')
      this.isPlaying = false
    }
    
    const when = this.audioContext.currentTime
    this.source.start(when, startPosition)
    
    this.startTime = when
    this.offsetTime = startPosition
    this.isPlaying = true
    
    console.log(`▶️ Tocando a partir de ${Math.floor(startPosition)}s`)
    console.log('✅ Música iniciada com sucesso!')
  }

  crossfadeToNew(startPosition = 0) {
    const crossfadeDuration = 1.0 // 1 segundo de crossfade
    const now = this.audioContext.currentTime
    
    // Fade out da música atual
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now)
    this.gainNode.gain.linearRampToValueAtTime(0, now + crossfadeDuration)
    
    // Criar novo analyser para nova música
    this.nextAnalyser = this.audioContext.createAnalyser()
    this.nextAnalyser.fftSize = 256
    this.nextAnalyser.smoothingTimeConstant = 0.8
    
    // Criar nova música com fade in
    this.nextGainNode = this.audioContext.createGain()
    this.nextGainNode.gain.setValueAtTime(0, now)
    this.nextGainNode.gain.linearRampToValueAtTime(1, now + crossfadeDuration)
    this.nextGainNode.connect(this.audioContext.destination)
    
    this.nextSource = this.audioContext.createBufferSource()
    this.nextSource.buffer = this.audioBuffer
    
    // Conectar nova música
    this.nextSource.connect(this.nextAnalyser)
    this.nextAnalyser.connect(this.nextGainNode)
    
    this.nextSource.onended = () => {
      console.log('🎵 Música terminou, aguardando próxima do servidor')
      this.isPlaying = false
    }
    
    this.nextSource.start(now, startPosition)
    
    // Para a música atual e troca referências após o crossfade
    setTimeout(() => {
      if (this.source) {
        this.source.stop()
        this.source.disconnect()
      }
      this.source = this.nextSource
      this.gainNode = this.nextGainNode
      this.analyser = this.nextAnalyser
      this.nextSource = null
      this.nextGainNode = null
      this.nextAnalyser = null
    }, crossfadeDuration * 1000)
    
    this.startTime = now
    this.offsetTime = startPosition
    
    console.log(`🔄 Crossfade para nova música (${crossfadeDuration}s)`)
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

  getAnalyser() {
    return this.analyser
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.offsetTime
    return this.offsetTime + (this.audioContext.currentTime - this.startTime)
  }
}

export default RadioStream