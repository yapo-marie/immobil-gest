# LOCATUS - Guide de Démarrage

## 🚀 Lancement de l'application

### Backend (API)
```bash
cd backend
./start.sh
```
Le backend sera accessible sur `http://localhost:8000`
Documentation API : `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm run dev
```
Le frontend sera accessible sur `http://localhost:8081`

## 🔐 Première Connexion

### Créer un compte bailleur via l'API

Vous pouvez créer un compte directement via Swagger (`http://localhost:8000/docs`) ou avec curl :

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bailleur@locatus.com",
    "password": "motdepasse123",
    "first_name": "Jean",
    "last_name": "Dupont",
    "phone": "0612345678",
    "role": "landlord"
  }'
```

### Se connecter

1. Allez sur `http://localhost:8081`
2. Vous serez redirigé vers `/login`
3. Entrez vos identifiants :
   - Email : `bailleur@locatus.com`
   - Mot de passe : `motdepasse123`

## 📊 Fonctionnalités disponibles

### Backend (API)
- ✅ Authentification JWT
- ✅ Gestion des biens immobiliers (CRUD)
- ✅ Gestion des locataires (CRUD + suppression)
- ✅ Gestion des baux (création, résiliation)
- ✅ Système de paiements
- ✅ Notifications

### Frontend
- ✅ Page de connexion
- ✅ Routes protégées
- ✅ Menu de navigation en français
- ✅ Tableau de bord (données mockées pour l'instant)
- ⏳ Intégration complète avec l'API (en cours)

## 🔧 Configuration

### Base de données
Le fichier `.env` du backend contient la configuration PostgreSQL.
Port utilisé : **5433** (PostgreSQL v18)

### Proxy Frontend → Backend
Le frontend est configuré pour rediriger `/api/*` vers `http://localhost:8000`

## 📝 Prochaines étapes

1. Connecter le Dashboard aux vraies données de l'API
2. Créer les pages de gestion des biens, locataires, baux
3. Implémenter le système de paiement avec Stripe
4. Ajouter les notifications en temps réel

## 🐛 Dépannage

### Le backend ne démarre pas
- Vérifiez que PostgreSQL est lancé : `sudo service postgresql start`
- Vérifiez le port dans `.env` (5433 pour PostgreSQL v18)

### Le frontend ne se connecte pas à l'API
- Vérifiez que le backend tourne sur le port 8000
- Vérifiez la configuration du proxy dans `vite.config.ts`

### Erreur 401 Unauthorized
- Vous devez d'abord vous connecter via `/login`
- Le token JWT est stocké dans `localStorage`
