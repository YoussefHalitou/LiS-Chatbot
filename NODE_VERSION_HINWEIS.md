# Node.js Version Hinweis

## Problem

Die aktuelle Node.js Version ist zu alt für Next.js 14.2.35.

- **Aktuelle Version**: Node.js 16.20.2
- **Benötigt**: Node.js >= 18.17.0

## Lösung

### Option 1: Node Version Manager verwenden (Empfohlen)

Wenn du `nvm` (Node Version Manager) verwendest:

```bash
# Node.js 18 oder höher installieren
nvm install 18
nvm use 18

# Oder Node.js 20 (LTS)
nvm install 20
nvm use 20
```

### Option 2: Node.js manuell installieren

Lade Node.js 18 LTS oder Node.js 20 LTS von [nodejs.org](https://nodejs.org/) herunter und installiere es.

### Option 3: Temporär mit älterer Next.js Version arbeiten

Falls du Node.js nicht upgraden kannst, downgrade Next.js auf eine Version, die Node.js 16 unterstützt:

```bash
npm install next@13.5.6 --save-exact
```

**Warnung**: Dies erfordert möglicherweise Code-Änderungen, da Next.js 13 und 14 unterschiedliche APIs haben.

## Empfehlung

**Node.js 18 LTS oder 20 LTS verwenden** - diese Versionen werden von Next.js 14.2.35 offiziell unterstützt und bieten bessere Performance und Sicherheit.

