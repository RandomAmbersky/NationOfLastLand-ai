#!/bin/bash

echo "🏗️  Building WebAssembly demo..."
wasm-pack build --target web --out-dir www/pkg --dev

echo "🚀 Starting demo server on http://localhost:8000"
echo "Open your browser and navigate to the URL above"
echo ""
echo "Demo controls:"
echo "1. Click 'Initialize Game' to set up the ECS world"
echo "2. Use 'Spawn Vehicle' to create entities"
echo "3. Watch the entities move in real-time!"
echo ""

cd www && python3 -m http.server 8000
