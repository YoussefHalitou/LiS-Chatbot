# Laufende Tests - Status

## Server-Start

```bash
npm run dev
```

## Tests durchführen

### 1. Health Check ✅
```bash
curl http://localhost:3000/api/health
```
**Erwartet**: Status "healthy" mit allen Services OK

### 2. Browser-Test
Öffne http://localhost:3000 im Browser

### 3. Chat API Test
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hallo"}],"chatId":null}'
```

## Logs

Die Server-Logs werden in der Konsole ausgegeben, wo `npm run dev` läuft.

## Troubleshooting

### Port bereits belegt
```bash
pkill -f "next dev"
npm run dev
```

### Kompilierungsfehler
- Prüfe die Konsole für Fehlermeldungen
- Stelle sicher, dass alle Dependencies installiert sind: `npm install`

