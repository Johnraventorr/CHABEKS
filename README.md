# Chabakes Ordering & Management System

Online ordering para sa Chabakes: customers mag-register, mag-order (pickup o delivery), at i-track ang order.
Admin naman ang nagma-manage ng orders, stock at presyo.

## Paano patakbuhin

Kailangan: [Node.js LTS](https://nodejs.org) (v18 pataas).

```bash
npm install
npm run dev          # development: frontend + backend
```

Buksan ang URL na ipi-print ng Vite (karaniwan ay **http://localhost:5173**). Para sa production-style run, gamitin ang `npm run serve` at buksan ang **http://localhost:3001**.

**Kung may error pagkatapos i-extract ang ZIP:** huwag gamitin ang lumang `node_modules` folder. Isara ang terminal, burahin ang `node_modules`, saka patakbuhin ang `npm install` sa folder na may `package.json`. Huwag burahin ang `data/` dahil naroon ang local orders at accounts.



## Admin account
- Username: `admin`
- Password: `admin123`  ← **palitan agad** (Admin → ⚙ pangalan mo → Palitan ang password)

Puwede ring itakda bago mag-start: `ADMIN_PASSWORD=bagongpassword npm start` (ginagamit lang kapag unang beses gagawin ang admin).

## Mga feature
**Customer**
- Register / login (naka-save sa server, gumagana sa kahit anong device)
- Menu na may Add/+/− at "Sold out" indicator; naka-save ang cart kahit i-refresh
- Checkout: Pickup o Delivery, petsa/oras (may minimum na paghahanda), Cash o GCash, notes
- Resibo na puwedeng i-print, My Orders na may progress tracker, Cancel (habang Pending), Order ulit

**Admin**
- Live na listahan ng orders (auto-refresh kada 10s, may notification sa bagong order)
- Confirm → Preparing → Ready → Completed sa isang click; Cancel; mark Paid/Unpaid
- Filter by status, search, sort by pickup date, Export CSV, print ng resibo
- Menu & stock: i-toggle ang Available/Sold out at palitan ang presyo
- Listahan ng customers (dami ng order, total gastos)

## Seguridad / tamang takbo
- Passwords naka-hash (scrypt); login token na may pirma at expiry
- Bawat endpoint may authorization: customers ay sarili lang nilang orders ang nakikita; admin lang ang makakapag-update ng status/stock
- **Server ang nagko-compute ng presyo** gamit ang menu — hindi mapapalitan ng customer ang presyo
- May validation: laman ng cart, dami, sold-out, petsa (hindi puwedeng nakaraan), address para sa delivery
- Limitado ang maling login (8 subok / 5 minuto)

## Saan naka-save ang data
`data/db.json` (users, orders, menu changes). I-backup ito. Huwag i-edit habang tumatakbo ang server.

## Pag-edit ng menu
Palitan ang pangalan/description/larawan sa `shared/menu.js` (ang mga larawan ay nasa `public/images`).
Ang presyo at availability ay puwede ring palitan ng admin sa website mismo.

## Mga setting (environment variables)
| Variable | Default | Gamit |
|---|---|---|
| `PORT` | 3001 | Port ng server |
| `ADMIN_PASSWORD` | admin123 | Unang password ng admin |
| `MIN_LEAD_HOURS` | 3 | Minimum na oras ng paghahanda bago ang pickup/delivery |
| `DATA_DIR` | ./data | Folder ng database |

## Test
`npm test` — 39 automated checks ng API (login, authorization, presyo, sold-out, cancel rules).

## Para sa public na hosting
Gumagana ito bilang isang Node app (`npm run serve`). Ilagay sa likod ng HTTPS (hal. Render, Railway, VPS na may Nginx),
palitan ang admin password, at i-backup ang `data/`. Para sa maraming sabay-sabay na user, ilipat ang `data/db.json` sa totoong database.


## GCash payment proof setup
Set `VITE_GCASH_RECEIVER_NUMBER` to the bakery owner's fixed GCash receiver number in a `.env` file at the project root (replace `09XXXXXXXXX`). Restart the development server after changing it. Customers selecting GCash must upload a screenshot; the admin can open it from the order card. The app stores compressed image proof in its local JSON database, so back up the `data` folder regularly.


## Google Sign-In setup (Firebase Authentication)
Google Sign-In uses Firebase Authentication popup. No manual OAuth Client ID in `.env` is needed. In Firebase Console for project `chabakes-7059c`, open **Authentication → Sign-in method** and enable **Google**. Then open **Authentication → Settings → Authorized domains** and add `localhost` plus the actual domain used for hosting. Restart the app after installing dependencies. The backend verifies the Firebase ID token signature and project audience; Google accounts are assigned the normal customer role and never automatically become admins. Google sign-in requires an internet connection and Google provider enabled in Firebase. The app cannot bypass Firebase provider/domain settings.


## Registration updates

Registration now collects email, phone, street/sitio, barangay, municipality/city, province, optional postal code and landmark, plus password confirmation. The login/register forms include a Show/Hide password control. The admin customer list also displays customer email. Existing local accounts and orders are kept in `data/db.json`; do not delete that folder when updating an existing installation.


## Ayusin ang `auth/api-key-not-valid`
Ang error na ito ay nanggagaling sa Firebase/Google API at hindi maaayos sa pagpalit lang ng design. Sa Firebase Console, buksan ang project `chabakes-7059c` → Project settings (gear) → General → Your apps → piliin ang Web app → SDK setup/configuration. Kopyahin ang `apiKey` at iba pang values nang eksakto. Gumawa ng `.env` sa root ng project (katabi ng `package.json`) gamit ang `.env.example`, at palitan ang `PASTE_EXACT_API_KEY_FROM_FIREBASE` ng aktuwal na `apiKey`. Huwag isama ang salitang `PASTE...` o quotes. I-save, ihinto ang server gamit ang Ctrl+C, saka `npm run dev` ulit.

Kung tama ang config pero error pa rin: sa Google Cloud Console para sa parehong project, buksan APIs & Services → Credentials → API key. Siguraduhing hindi deleted ang key at ang Application restrictions ay angkop sa web app (HTTP referrers, kabilang ang `http://localhost:5173/*` at `http://localhost:3001/*` kung ginagamit). Tiyaking hindi naharang ang Identity Toolkit API restrictions. Sa Firebase Authentication → Sign-in method i-enable ang Google provider, at sa Authorized domains idagdag ang `localhost`.


## Admin at login refresh (October 2026)
- Refreshed the dashboard styling with colored KPI cards, cleaner tab navigation, status workflow, payment review, and responsive layout based on the provided reference.
- Refreshed login/register form styling and added popup-to-redirect fallback for Google sign-in.
- Firebase configuration can be set in the root `.env` with `VITE_FIREBASE_*` variables. Copy `.env.example` to `.env`, then restart the Vite server after changes.
- **Google sign-in still requires Firebase Console setup:** enable Authentication > Sign-in method > Google and add `localhost` to Authorized domains. The project must use a valid API key from Project settings > General > Your apps. Code cannot make an invalid/disabled/restricted key valid; if `auth/api-key-not-valid` remains, replace it with the exact key shown in the console and check Google Cloud API key restrictions.
- Admin account credentials and role behavior remain controlled by the server-side setup; do not use a customer Google account as an admin.

## Netlify deployment (frontend) + persistent API hosting

This project has a Node.js API and a JSON-file database. Netlify hosts the Vite frontend, but it does **not** run `server.js` as a persistent Node server. Deploy the API separately, then point Netlify to it:

1. Push this project to a Git repository.
2. Deploy the repository's `render.yaml` service on Render. The API uses `/var/data` for its database; the included persistent disk requires a paid Render instance. Set `ADMIN_PASSWORD` to a strong private value and set `FRONTEND_ORIGIN` to your exact Netlify site URL (for example `https://your-site.netlify.app`).
3. In Netlify, import the same repository. Build command: `npm run build`; publish directory: `dist` (also configured in `netlify.toml`).
4. In Netlify → Site configuration → Environment variables, add `VITE_API_BASE_URL` with the full Render API origin, e.g. `https://your-api.onrender.com` (no trailing slash). Trigger a new deploy after setting it.
5. In Firebase Authentication, add your Netlify domain to Authorized domains and enable Google sign-in if you want that optional button to work.
6. Test registration/login, menu loading, checkout, customer order tracking, and admin updates on the deployed domains before sharing the site.

**Important:** Do not deploy the frontend alone and expect login/orders/admin to work. Those features require the separately deployed API. The local `data/db.json` is not automatically transferred to the hosted database; export/transfer existing records separately if needed. Never publish `.env` or share the generated admin password.

## Netlify deployment (frontend) + persistent API hosting

This project has a Node.js API and a JSON-file database. Netlify hosts the Vite frontend, but it does **not** run `server.js` as a persistent Node server. Deploy the API separately, then point Netlify to it:

1. Push this project to a Git repository.
2. Deploy the repository's `render.yaml` service on Render. The API uses `/var/data` for its database; the included persistent disk requires a paid Render instance. Set `ADMIN_PASSWORD` to a strong private value and set `FRONTEND_ORIGIN` to your exact Netlify site URL (for example `https://your-site.netlify.app`).
3. In Netlify, import the same repository. Build command: `npm run build`; publish directory: `dist` (also configured in `netlify.toml`).
4. In Netlify → Site configuration → Environment variables, add `VITE_API_BASE_URL` with the full Render API origin, e.g. `https://your-api.onrender.com` (no trailing slash). Trigger a new deploy after setting it.
5. In Firebase Authentication, add your Netlify domain to Authorized domains and enable Google sign-in if you want that optional button to work.
6. Test registration/login, menu loading, checkout, customer order tracking, and admin updates on the deployed domains before sharing the site.

**Important:** Do not deploy the frontend alone and expect login/orders/admin to work. Those features require the separately deployed API. The local `data/db.json` is not automatically transferred to the hosted database; export/transfer existing records separately if needed. Never publish `.env` or share the generated admin password.


## UI polish (November 2026)
- Product thumbnails on the landing page now use a compact, consistent card layout and `object-fit: contain` so baked goods are not excessively zoomed or cropped.
- Menu item thumbnails use bounded square dimensions and contain-fit sizing.
- Customer login/register and order-history screens use the violet theme with responsive spacing and clearer form controls.
