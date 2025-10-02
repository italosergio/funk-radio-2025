#!/bin/bash

echo "🚀 Iniciando Funk Radio em modo desenvolvimento..."

# Para containers existentes
docker-compose --profile dev down

# Sobe MongoDB primeiro
echo "📦 Subindo MongoDB..."
docker-compose up mongodb -d

# Aguarda MongoDB ficar saudável
echo "⏳ Aguardando MongoDB ficar pronto..."
until docker-compose exec mongodb mongo --eval "db.runCommand('ping')" > /dev/null 2>&1; do
  echo "   Aguardando MongoDB..."
  sleep 2
done

echo "✅ MongoDB pronto!"

# Sobe servidor de desenvolvimento
echo "🔧 Subindo servidor de desenvolvimento..."
docker-compose --profile dev up dev-server -d

# Aguarda servidor ficar pronto
echo "⏳ Aguardando servidor ficar pronto..."
until curl -f http://localhost:3001 > /dev/null 2>&1; do
  echo "   Aguardando servidor..."
  sleep 2
done

echo "✅ Servidor pronto!"
echo "🎵 Funk Radio rodando em:"
echo "   Backend: http://localhost:3001"
echo "   Frontend: Inicie com 'npm run client'"
echo ""
echo "📊 Para ver logs: docker-compose logs -f"
echo "🛑 Para parar: docker-compose --profile dev down"