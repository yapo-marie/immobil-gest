# LOCATUS – Gestion locative (FastAPI + React)

Application full-stack pour bailleurs : biens, locataires, baux, paiements (Stripe test), notifications. Backend FastAPI (PostgreSQL) et frontend React/Vite (TypeScript, React Query, shadcn UI).

## Aperçu fonctionnel
- Authentification JWT (bailleur/admin).
- CRUD biens, locataires, baux.
- Paiements (Stripe test) et reçus PDF simples.
- Notifications basiques.
- Upload d’images (local ou Cloudinary).

## Stack
- Backend : FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL (port 5433).
- Frontend : React 18 + Vite, TypeScript, React Query, shadcn/ui, axios.
- Auth : OAuth2 password flow, JWT access token (stocké localStorage).

## Pré-requis
- Python 3.11+, Node 18+, PostgreSQL (port par défaut 5433).
- Ports : API 8000, Front 8080 (proxy `/api` → 8000).

## Installation rapide
```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# lancer l'API
./start.sh

# Frontend
cd ../frontend
npm install
npm run dev   # http://localhost:8080
```

## Configuration (.env backend)
Exemple minimal :
```
DATABASE_URL=postgresql://user:password@localhost:5433/immobilier
SECRET_KEY=change-me
ALGORITHM=HS256
FRONTEND_URL=http://localhost:8080
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
APP_URL=http://localhost:8080
TIMEZONE=UTC
```

## Démarrage & URLs
- API : http://localhost:8000
- Swagger : http://localhost:8000/docs
- Front : http://localhost:8080

## Comptes de test
Créer un bailleur via Swagger ou curl :
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"bailleur@locatus.com","password":"motdepasse123","first_name":"Jean","last_name":"Dupont","phone":"0612345678","role":"landlord"}'
```
Login web : `bailleur@locatus.com` / `motdepasse123`

## Routes API clés
- Auth : `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Biens : `GET/POST /api/properties`, `PUT /api/properties/{id}`
- Locataires : `GET/POST /api/tenants`, `PUT /api/tenants/{id}`
- Baux : `GET/POST /api/leases`, `PUT /api/leases/{id}`
- Paiements Stripe : `POST /api/payments/{id}/intent`, `POST /api/payments/{id}/checkout-session`
- Alias sans préfixe `/api` (mêmes opérations, même base) : `/properties`, `/tenants`, `/leases`

## Dépannage
- Backend ne démarre pas : vérifier PostgreSQL (`sudo service postgresql start`), port 5433 dans `.env`.
- Front ne voit pas l’API : backend sur 8000, proxy `/api` dans `vite.config.ts`, variable `FRONTEND_URL`.
- 401 côté front : reconnectez-vous, le token est en localStorage (`token`).

## Prochaines évolutions possibles
- Liaison complète Dashboard ↔ API.
- Paiement PI-SPI ou autre PSP.
- Notifications temps réel (websockets).
