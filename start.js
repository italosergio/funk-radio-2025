import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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