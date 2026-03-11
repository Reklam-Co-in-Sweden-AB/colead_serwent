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
