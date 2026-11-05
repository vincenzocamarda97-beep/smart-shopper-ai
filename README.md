# Smart Shopper AI — Full-stack MVP

## Cosa include
- PWA colorata installabile su iPhone/Android via browser.
- Backend Flask con SQLite.
- Registrazione/login con password hashate e sessioni cookie.
- Catalogo prodotti, ricerca, categorie e valute.
- Preferiti e watchlist prezzi per utente.
- Lista negozi e link di ricerca pubblici.
- Endpoint assistente AI opzionale via API key server-side.
- Import prodotti via CSV per amministratore.
- Endpoint riepilogo admin e bootstrap amministratore one-time.

## Avvio locale
Richiede Python 3.10+.

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python server.py
```
Apri http://localhost:8000. Per produzione usa HTTPS e un `SECRET_KEY` casuale robusto.

## API principali
- `GET /api/health`
- `POST /api/register` `{ "email":"...", "password":"minimo 10 caratteri" }`
- `POST /api/login` / `POST /api/logout`
- `GET /api/me`
- `GET /api/products?q=robot&currency=CHF&max_price=200`
- `GET /api/stores`
- `GET/POST /api/favorites` e `POST /api/favorites/<product_id>`
- `GET/POST /api/watchlist`, `DELETE /api/watchlist/<id>`
- `POST /api/assistant` (risposta AI vera solo se `OPENAI_API_KEY` è configurata)
- `POST /api/admin/create-first-admin` (richiede `BOOTSTRAP_ADMIN_SECRET`)
- `POST /api/admin/import-csv` (sessione admin; multipart file CSV)
- `GET /api/admin/summary`

CSV import columns:
`name,category,description,currency,price,product_url,retailer,external_id`

## Configurazione primo amministratore
1. Imposta `BOOTSTRAP_ADMIN_SECRET` in ambiente.
2. Invia POST `/api/admin/create-first-admin` con `secret`, `email`, `password` (minimo 14 caratteri).
3. Rimuovi `BOOTSTRAP_ADMIN_SECRET` dopo il bootstrap.

## Limiti e passaggi necessari prima del lancio pubblico
Questa è una base software eseguibile, non un servizio già pubblicato o autorizzato.
- Il catalogo iniziale è esplicitamente dimostrativo. Prezzi reali richiedono feed/API, accordi o import autorizzati dei rivenditori. Non usare scraping contrario ai termini.
- I link ai negozi aprono ricerche pubbliche; non sono link affiliati e non generano commissioni.
- La watchlist salva un target ma non invia notifiche: serve un job schedulato, fonte prezzo affidabile e provider email/push.
- Il piano PRO è illustrato ma non vende abbonamenti: per attivare pagamenti serve un account PSP, webhook verificati, fatturazione, rimborsi e compliance.
- Per produzione: database gestito e backup, rate limiting, CSRF/CORS review, email verification/password reset, logging/monitoring, privacy policy, termini, cookie/analytics consent e test di sicurezza.
- Per pubblicare sugli store servono account Apple/Google, build nativa (es. Capacitor), icone/screenshot e revisione degli store.
- Prima del lancio in Svizzera e Italia, ottenere consulenza su privacy, consumer law, affiliate disclosures e imposte.

Non mettere mai API keys o password nel frontend o nel repository.
