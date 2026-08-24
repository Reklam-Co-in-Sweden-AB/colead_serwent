# Serwent Bestilling — CLAUDE.md

## Projektöversikt

Standalone bestillingsapp för Serwent (norskt slam-/septiktömningsföretag). Byggd som en fristående Next.js-app som integrerar med CoLead via API för lead-synkronisering.

## Stack

- **Ramverk:** Next.js 15 (App Router)
- **Språk:** TypeScript
- **Databas:** Supabase (PostgreSQL + Auth + RLS)
- **Styling:** Tailwind CSS v4
- **Hosting:** Vercel
- **Fonter:** DM Sans + Playfair Display

## Design

Serwent-profil med ljust tema:
- **Navy:** #1B3A6B (primär)
- **Röd:** #E8321E (accent/CTA)
- **Bakgrund:** #f0f4f8 gradient
- **Surface:** #ffffff

## Struktur

```
src/
├── app/
│   ├── page.tsx              # Publikt bestillningsformulär
│   ├── login/page.tsx        # Supabase-inloggning
│   ├── admin/page.tsx        # Admin-panel (auth-skyddad)
│   └── api/
│       ├── orders/submit/    # POST — spara bestilling
│       ├── orders/[id]/      # PATCH — uppdatera status
│       ├── orders/export/    # GET — CSV-export
│       └── address/          # GET — Kartverket adressuppslag
├── actions/
│   ├── orders.ts             # Server actions för orders
│   └── auth.ts               # Login/logout
├── components/
│   ├── order/
│   │   ├── OrderForm.tsx     # Publikt formulär
│   │   ├── AdminPanel.tsx    # Admin-vy med tabell
│   │   └── AddressLookup.tsx # Kartverket-integration
│   └── ui/                   # Button, Input, Select, Card, Badge
├── lib/
│   ├── constants.ts          # Kommuner, tömningstyper, statusar
│   ├── colead.ts             # CoLead API-integration
│   ├── rate-limit.ts         # In-memory rate limiter
│   └── supabase/             # client, server, admin, middleware
└── types/
    └── database.ts           # TypeScript-typer
```

## CoLead-integration

Vid varje ny bestilling synkas data till CoLead via `POST /api/leads/submit`. Konfigureras med:
- `COLEAD_API_URL` — CoLead-instansens URL
- `COLEAD_FORM_ID` — UUID för Serwent-formuläret i CoLead

## Kommandon

```bash
npm run dev     # Starta utvecklingsserver
npm run build   # Bygga för produktion
npm run lint    # Kör ESLint
```

## Lärdomar

### Supabase returnerar tyst max 1000 rader

PostgREST har en standardgräns på 1000 rader per anrop. En query utan paginering
kastar **inget fel** — den returnerar bara de första 1000 raderna. För aggregat
och statistik ger det siffror som ser rimliga ut men är kraftigt fel.

Detta orsakade buggen som Thomas Austbø rapporterade 2026-08-04: vyn
"Produksjon per bil & operatør" visade data endast till 2026-05-08 trots att
`serwent_komtek_tomming` innehöll rader fram till 2026-08-01. De första 1000
raderna i fysisk ordning slutade exakt på 2026-05-08. Ole Voldhaugs 519
tömningar visades som 145.

**Regel:** använd alltid `fetchAllRows()` från `@/lib/supabase/fetch-all` när en
query kan returnera fler än 1000 rader (allt som hämtar ett helt år av
`serwent_komtek_tomming` eller `orders`). Sortera på en unik kolumn (`id`) i
queryn — utan stabil sortering är radordningen mellan sidorna odefinierad och
rader kan dupliceras eller hoppas över.

Samma bugg återkom 2026-08-24: `orders` passerade 1000 rader och dashboarden
frös på "1000 totalt / 0 nye / 1 under behandling / 999 utført" medan databasen
hade 2 643 bestillinger. Fem ställen hämtade `orders` (och
`serwent_conversions`) utan paginering: dashboarden, bestillingslistan,
CSV-exporten, rapportsidan och de schemalagda automationerna. Fixen infördes
bara i produksjon-/ressurser-flödena i augusti — övriga hämtställen missades.

**Vid rena räkningar:** använd `.select("*", { count: "exact", head: true })` i
stället för att hämta rader och räkna i minnet. Det är både korrekt och
billigare. Att filtrera en hämtad lista för att räkna status är själva
antimönstret som orsakade båda buggarna.

**Kom ihåg vid nya features:** varje ny query mot `orders`, `serwent_conversions`
eller `serwent_form_views` måste antingen pagineras, räknas med `count`, eller
medvetet begränsas med `.limit()`.

### Volymer kan komma in i liter i stället för m³

Två rader hos Ole Voldhaug (2026-06-26) hade `tomme_volum` 13500 och 11000 medan
snittet för övriga rader är 4,33 m³ — liter-inmatningar i källsystemet. Thomas
Austbø bekräftade 2026-08-05 att rätt volym är 13,5 och 11 m³, och raderna
rättades i databasen 2026-08-10. Oles m³/dag gick då från 431,2 till 42,7.

Enstaka sådana rader slår hårt mot m³/dag-snittet — kontrollera extremvärden
innan produktionssiffror tolkas. Efter rättningen är högsta kvarvarande värden
90, 85 och 55 m³ (en rad vardera), vilka är rimliga för större anlegg.

**Obs:** rättningen gjordes bara i portalens databas. Felet finns kvar i Comtech,
så en omimport av samma period kan skriva tillbaka liter-värdena — verifiera
extremvärden efter varje import tills källan är rättad.
