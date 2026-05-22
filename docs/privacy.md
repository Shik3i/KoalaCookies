# KoalaCookies - Datenschutzerklärung (Privacy Policy)

## Grundsatz

KoalaCookies verarbeitet **keine personenbezogenen Daten**. Alle Vorgänge finden ausschließlich lokal im Browser des Nutzers statt. Es werden zu keinem Zeitpunkt Daten an externe Server, den Entwickler oder Dritte übermittelt.

## Datenerhebung und -verarbeitung

### Was wird gespeichert?

Die Extension speichert ausschließlich folgende Daten **lokal im Browser** via `chrome.storage.local`:

| Datenkategorie | Beschreibung | Zweck |
|---|---|---|
| **Statistiken** | Anzahl erkannter/abgelehnter/übersprungener Cookie-Banner, aufgeschlüsselt nach Domain | Anzeige im Popup für den Nutzer |
| **Einstellungen** | Gewählter Modus (sanft/aggressiv), Domain-Whitelist | Konfiguration des Verhaltens |

### Was wird NICHT gespeichert oder übermittelt?

- **Keine** personenbezogenen Daten (Name, E-Mail, IP-Adresse, etc.)
- **Keine** Browser-Verlaufsdaten
- **Keine** Cookies oder sonstige Trackingdaten
- **Keine** Telemetrie, Analytics oder Nutzungsstatistiken an externe Server
- **Keine** Unique IDs oder Fingerprinting-Daten

## Datenweitergabe

**Es findet keine Datenweitergabe statt.** KoalaCookies kommuniziert nicht mit externen Servern und führt keine Netzwerkanfragen aus (mit Ausnahme dessen, was für die Extension-Installation und -Updates durch den Browser-Store nötig ist).

## Datenaufbewahrung

Alle Daten werden ausschließlich im lokalen Browser-Speicher (`chrome.storage.local`) abgelegt und verbleiben dort, bis:
- Der Nutzer die Extension deinstalliert
- Der Nutzer die Browser-Daten manuell löscht
- Der Nutzer die Extension-Daten über die Browser-Einstellungen zurücksetzt

## Berechtigungen

Die Extension fordert folgende Berechtigungen an:

| Berechtigung | Begründung |
|---|---|
| `storage` | Zum lokalen Speichern von Statistiken und Einstellungen |
| `activeTab` / `<all_urls>` | Zugriff auf Webseiten-DOM zur Erkennung und Interaktion mit Cookie-Bannern |

## Dritt-Anbieter / Externe Ressourcen

KoalaCookies bindet **keine** externen Ressourcen ein:
- Keine CDNs (kein Google Fonts, kein Bootstrap CDN, etc.)
- Keine externen Skripte oder Stylesheets
- Keine Tracking-Pixel oder Analytics-Skripte
- Alle Assets sind lokal in der Extension gebündelt

## Open Source & Auditierbarkeit

Der vollständige Quellcode von KoalaCookies ist öffentlich einsehbar unter:
[https://github.com/Shik3i/KoalaCookies](https://github.com/Shik3i/KoalaCookies)

Jeder kann den Code auf Datenschutzkonformität prüfen. Die Extension wird unter der MIT-Lizenz veröffentlicht.

## Änderungen dieser Datenschutzerklärung

Änderungen werden in der Commit-Historie des Repositories nachvollziehbar dokumentiert. Bei wesentlichen Änderungen wird dies in den Release Notes kommuniziert.

## Kontakt

Bei Fragen zum Datenschutz: Erstelle ein Issue im GitHub-Repository oder kontaktiere den Maintainer über die GitHub-Profilseite.

---

*Letzte Änderung: 2024 (Projektbeginn)*
*Wirksam ab: v0.1.0*
