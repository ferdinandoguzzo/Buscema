# PRD — Buscema Gastronomia · Scheda Contatto Buyer

## Problem statement
Mobile-first web app per la raccolta lead in fiera per "Buscema Gastronomia". Interfaccia pulita, professionale, ergonomica, brandizzata sui colori del logo (verde scuro #1A432B, oro #C5A059, sfondo bianco, accenti tricolore).

## Architecture
- Backend: FastAPI + MongoDB (motor). Routes prefixed `/api`.
- Frontend: React 19 + Tailwind + shadcn/ui + react-router. Mobile-first single column, multi-col su desktop.
- OCR: Claude Sonnet 4.6 vision via emergentintegrations (EMERGENT_LLM_KEY).
- QR/vCard: html5-qrcode (camera) + parser vCard client-side.
- Auth Storico: password condivisa operatori (env HISTORY_PASSWORD) -> JWT bearer (24h).

## User personas
- Operatore fiera: compila schede al volo con una mano, scansiona QR o fotografa biglietti.
- Responsabile commerciale: consulta lo storico, filtra ed esporta CSV per il CRM.

## Core requirements (static)
- Header con logo, titolo "Scheda Contatto Buyer", Nome Fiera + Anno (default 2026).
- Trigger ibridi: Scansiona QR/vCard, Foto Biglietto OCR (salva foto come allegato base64).
- Sezioni: Anagrafica, Tipologia Azienda, Interesse (brand+prodotti), Packaging/Formato, Progetto, Campioni, Valutazione (priorità A/B/C/D + potenziale 5 stelle), Note.
- Salva Scheda -> MongoDB.
- Storico Contatti protetto da password con filtri (priorità/fiera/ragione sociale) ed export CSV.

## Implemented (2026-06)
- ✅ Full form con tutte le sezioni, chip tap-friendly, 5 stelle interattive, sticky save.
- ✅ QR/vCard scan + auto-fill anagrafica; OCR biglietto (Claude Sonnet 4.6) + auto-fill + foto allegata.
- ✅ Backend: POST /api/leads, GET /api/leads (filtri + JWT), GET /api/leads/export (CSV ; delimiter, no foto), POST /api/leads/ocr, POST /api/history/auth.
- ✅ Storico Contatti con login, filtri, export CSV. Tested 100% (13/13 backend, tutti i flussi frontend).

## Backlog / next
- P1: proteggere l'endpoint OCR con rate limiting (attualmente pubblico per l'uso pre-login del form).
- P2: dettaglio scheda / modifica lead dallo storico; endpoint delete.
- P2: sostituire il logo provvisorio generato con quello ufficiale Buscema quando fornito.
- P2: export Excel (.xlsx) oltre al CSV.
