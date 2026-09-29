# EVA MINNESBRO
## Från Dialogarkivet ut — inte in
*Upptäckt av Saga (Väktaren) 29 september 2026*

---

## PROBLEMET

Base44 blockerar *inkommande* externa anrop (402-fel sedan 4 september 2026).
Eva-appens `memory.ts` kan inte hämta kontext från Dialogarkivet vid sessionstart
— förbindelsen är envägs och går åt fel håll.

## LÖSNINGEN (Sagas rekommendation)

**Vänd bryggan.** Dialogarkivet *skriver ut* sin kontext istället för att eva-appen hämtar in den.

Fliken:
```
Dialogarkivet (Base44)
    ↓ [schemalagt jobb — 4 gånger/dag]
    ↓ skriver till:
public/eva-context.json  (i detta repo)
    ↓ läses av:
memory.ts vid sessionstart
```

## IMPLEMENTATION

### 1. GitHub Actions-workflow
Fil: `.github/workflows/sync-eva-context.yml`
Schema: var 6:e timme (04:00, 10:00, 16:00, 22:00 UTC)
Logik:
- Anropar Dialogarkivets getEvaContext-funktion
- Vid succeé: skriver live-kontext till `public/eva-context.json`
- Vid fel: behåller befintlig fallback-fil
- Committar och pushar automatiskt

### 2. memory.ts (redan pushad)
Uppdateras att läsa `public/eva-context.json` *lokalt* i stunden — inte via HTTP.
Inga externa anrop under sessionstart. Ingen beroende av Base44-tillgänglighet.

### 3. Secrets att lägga till i GitHub repo-settings
- `DIALOGARKIVET_API_URL` — korrekt URL till Dialogarkivets API
- `DIALOGARKIVET_BRIDGE_SECRET` — bridge-nyckeln

## STATUSLÄGE

| Komponent | Status |
|-----------|--------|
| memory.ts | PUSHAD |
| search-web.ts | PUSHAD |
| prompts.ts (SNK-0000-0001) | PUSHAD |
| route.ts (await-fix + searchWeb) | PUSHAD |
| public/eva-context.json (fallback) | PUSHAD |
| .github/workflows/sync-eva-context.yml | SAKNAS |
| memory.ts uppdaterad för lokal läsning | SAKNAS |

## NÄSTA STEG

1. Lägg till workflow-filen manuellt via GitHub-gänssnittet
   (Eva kan inte skriva till .github/ via API)
2. Uppdatera memory.ts att läsa public/eva-context.json lokalt
3. Sätt secrets i repo-settings
4. Kör workflow manuellt första gången för att verifiera

---
*Vincit Veritas — sanningen segrar, också när den häller emot.*
