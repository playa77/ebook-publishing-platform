# Autorenstudio

**Deine Geschichte. Dein Ton. Dein Buch.**

Deutschsprachige Schreibwerkstatt für einzelne Autor:innen: von Idee oder
importierter Outline über Stil, Szenen und Überarbeitung zum Kindle-E-Book.
Der einladungsbasierte private Pilot soll Qualität und tragfähige Stückkosten
belegen, bevor ein kostenpflichtiges Produkt angeboten wird.

## Produkt

Roman zuerst: LitRPG/Progression, Dark Academia und Domestic Thriller.
Sachbuch erhält Basisunterstützung ohne Recherche oder Faktenverifikation.
Import aus Text, Markdown oder DOCX; bearbeitbare Outline und Stilvorgaben.
Menschliche Freigabe der Vorbereitung; danach Szene prüfen oder höchstens
ein Kapitel automatisch schreiben lassen. Direkte Bearbeitung, Autosave,
Versionen und Wiederherstellung bleiben Kernfunktionen.

Kontinuität führt Quellen für Figurenwissen, Chronologie, Regeln, Ressourcen
und offene Entscheidungen. Normale Änderungsbefugnis bleibt im Auftrag.
YOLO erlaubt begrenzte, protokollierte historische Reparaturen.
Zielausgabe: privates EPUB 3.3, Cover und deutscher Exportbericht.
Nutzer:innen prüfen im Kindle Previewer und laden selbst bei Amazon KDP hoch.

## Zwei Textrollen

**Orchestrierung: deepseek-4.1-flash (Produkt-Pin).** Planung, Rückfragen,
Stil und Constraints, Pre-Draft-Gates, Prüfung, Kontinuität und Reparaturaufträge.
Die Anwendung kontrolliert Zustände, Budgets und Commits.

**Prosa: ein qualifiziertes Schreibmodell.** Haiku 5.5, Luna 6 und Mistral
Large 4 sind Kandidaten; noch keine neue Auswahl ist qualifiziert.
Pro Szene ein frischer Kontext, ausschließlich Prosa als Ergebnis.
Auch Prosa-Reparaturen gehören dem Schreibmodell.

Der Writer erhält ein kompaktes, geprüftes Szenenpaket statt einer ganzen
Agentensitzung. Reasoning aus ist die erste Versuchskonfiguration, niedrig die
Vergleichskonfiguration; entschieden wird nach deutscher Qualität und
Gesamtkosten. API-IDs und Fähigkeiten sind vor Livebetrieb zu verifizieren.

## Tatsächlicher Stand und Entwicklung

Implementiert sind Next.js-Oberfläche, geschlossene Verträge und Richtlinien.
Datenbank, Anmeldung, Worker, Zweirollen-Pipeline und EPUB-Export fehlen noch.
Die Laufzeitkonfiguration enthält weiterhin die alte Mistral-Policy;
diese Dokumentrevision ändert keine Provider-Konfiguration.

Node.js **26.13.0**, npm **11.20.0**:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Die Zielanwendung verwendet Next.js/React, Supabase und einen dauerhaften
Node-Worker. Java 21/EPUBCheck werden für den späteren Export benötigt.

## Dokumentation

| Thema | Quelle |
|---|---|
| Produkt, Architektur, Wirtschaftlichkeit | [Architektur](docs/architecture.md) |
| Verträge und gezielte Baseline-Referenzen | [Technische Spezifikation](docs/technical-spec.md) |
| Rollen, Szenenpaket, Prüfharness, Messplan | [Schreibsystem](docs/writing-system.md) |
| Abhängigkeiten und Abnahme | [Implementierungsplan](docs/implementation-roadmap.md) |
| Implementiert und ausgeführt | [Runbook](docs/runbook.md), [Release-Bericht](docs/release-report.md) |

Aktive Dokumente: Version 2.0.0, Entwurf. Nummerierte v1.0.0-Dateien bleiben
historische Referenzen; nur benötigte Abschnitte lesen.

Keine öffentliche Registrierung, Abrechnung, Zusammenarbeit, Recherche,
öffentliche Manuskriptlinks, Drucklayouts oder direkte KDP-Einreichung im Pilot.
Private Daten und Downloads bleiben kontogebunden. KI-Prüfungen garantieren
keine literarische Qualität oder Amazon-Annahme.

MIT — siehe [LICENSE](LICENSE).
