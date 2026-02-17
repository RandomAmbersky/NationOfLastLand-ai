#!/bin/bash


#Dt-demo.sh - Запуск TypeScript версии Nation of Last Land
#Usage: ./ts-demo.sh

set -e

echo "🚀 Запуск TypeScript версии Nation of Last Land..."

# Переход в директорию www-ts
cd www-ts

# Проверка установки зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

# Сборка проекта
echo "🔨 Сборка TypeScript..."
npm run build

# Запуск dev-сервера
echo "🌐 Запуск dev-сервера..."
echo "   Откройте http://localhost:3001 в браузере"
echo "   Для остановки сервера нажмите Ctrl+C"

npm run dev