#!/bin/bash
# Activer l'environnement virtuel
source venv/bin/activate

# Lancer le serveur
echo "🚀 Démarrage du serveur LOCATUS..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
