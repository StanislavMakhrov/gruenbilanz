# GrünBilanz

CO₂-Fußabdruck-Rechner und ESG-Berichterstattung für deutsche Handwerksbetriebe.

GrünBilanz berechnet den betrieblichen CO₂-Fußabdruck nach GHG Protocol Corporate Standard (Scope 1, 2, 3) und erstellt GHG-Protokoll-PDFs sowie CSRD-Fragebögen — fertig zum Versand an Großkunden und Banken.

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) oder Docker Engine + Docker Compose Plugin (Linux)
- [Git](https://git-scm.com/)

## Schnellstart in 3 Schritten

```bash
# 1. Repository klonen
git clone https://github.com/your-org/gruenbilanz.git
cd gruenbilanz

# 2. Anwendung bauen und starten
docker compose up --build

# 3. Im Browser öffnen
open http://localhost:3000
```

Beim ersten Start:

- PostgreSQL wird initialisiert und Prisma-Migrationen werden ausgeführt.
- Alle UBA-2024-Emissionsfaktoren und Demo-Stammdaten werden automatisch eingespielt.
- Das Dashboard zeigt Demo-Daten für *Mustermann Elektro GmbH* (12 MA, München).

## Architektur

| Service | Port | Beschreibung |
|---------|------|--------------|
| `app` | 3000 | Next.js 14 + PostgreSQL 15 (supervisord) |
| `tesseract` | 3001 | Tesseract OCR REST-API |

Persistente Daten werden im Docker-Volume `gruenbilanz_pgdata` gespeichert.

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
cd src && npm install

# Umgebungsvariablen setzen
cp .env.example .env

# Datenbank mit Docker Compose starten (nur PostgreSQL + Tesseract)
docker compose up tesseract -d

# Prisma-Migrationen und Seed ausführen
cd src && npx prisma migrate dev && npx tsx ../prisma/seed.ts

# Entwicklungsserver starten
npm run dev
```

## Lizenz

[MIT](LICENSE)
