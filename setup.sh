#!/bin/bash

echo "🔧 Configurando ambiente para Rádio Funk 2025..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Verificar se usuário está no grupo docker
if ! groups $USER | grep -q docker; then
    echo "➕ Adicionando usuário ao grupo docker..."
    sudo usermod -aG docker $USER
    echo "✅ Usuário adicionado ao grupo docker"
    echo "⚠️  IMPORTANTE: Faça logout/login ou execute: newgrp docker"
else
    echo "✅ Usuário já está no grupo docker"
fi

# Verificar se Docker está rodando
if ! sudo systemctl is-active --quiet docker; then
    echo "🚀 Iniciando Docker..."
    sudo systemctl start docker
fi

echo "✅ Setup concluído!"