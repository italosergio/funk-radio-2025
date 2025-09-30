const { spawn } = require('child_process')
const path = require('path')

// Inicia o servidor
const server = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit'
})

server.on('error', (err) => {
  console.error('Erro ao iniciar servidor:', err)
  process.exit(1)
})

server.on('exit', (code) => {
  console.log(`Servidor encerrado com código ${code}`)
  process.exit(code)
})