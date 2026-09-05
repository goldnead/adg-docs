---
description: Wann Käufer der Suite einen Auftragsverarbeitungsvertrag brauchen, mit wem, und eine ausfüllbare Vorlage nach Art. 28 Abs. 3 DSGVO.
---

# AVV-Baustein (Entwurf)

::: danger ENTWURF vom 01.09.2026
**Dieser Text ist ein Entwurf und anwaltlich nicht geprüft. Er ist kein Rechtsrat.** Stellen, die mit „prüfen" markiert sind, sind offen und gehören vor einer Nutzung zu einer Rechtsanwältin oder einem Rechtsanwalt. Wie diese Dokumentation entsteht, steht unter [How this is built](/guide/how-this-is-built).
:::

Diese Seite ist auf Deutsch, weil sie sich an Betreiber richtet, die mit der Suite in Deutschland verkaufen und dabei deutschem und europäischem Datenschutzrecht unterliegen. Der Rest der Dokumentation ist auf Englisch.

## Warum du mit dem Addon-Anbieter meist keinen AVV brauchst

Die Suite ist selbst gehostete Software. Du installierst die Pakete per Composer in deine eigene Statamic-Installation, sie laufen auf deinem Server, und alle Daten, die dabei entstehen, liegen in deiner Datenbank und deinem Dateisystem: Kontakte in LeadHub, Abonnenten in Marketing, Zahlungen in Payments, Rechnungen in Invoices, Einwilligungsnachweise in Consent. Der Anbieter der Addons, Adrian Goldner, hat auf diese Daten keinen Zugriff und bekommt sie nicht übermittelt. Er verarbeitet damit im Normalfall keine personenbezogenen Daten in deinem Auftrag. Wo keine Verarbeitung im Auftrag stattfindet, gibt es keinen Auftragsverarbeiter im Sinne von Art. 4 Nr. 8 DSGVO, und ein Vertrag nach Art. 28 DSGVO hat keinen Gegenstand. Das ist der Unterschied zu einer gehosteten Plattform wie ablefy oder Digistore24, bei der der Plattformbetreiber deine Kundendaten hält und deshalb zwingend Auftragsverarbeiter ist.

Auftragsverarbeiter hast du trotzdem, nur andere. Dein Hoster hält den Server, auf dem die Daten liegen. Dein Zahlungsdienstleister verarbeitet Namen, E-Mail-Adressen und Zahlungsdaten deiner Käufer, teils im Auftrag, teils in eigener Verantwortung. Dein Mailversender bekommt jede Adresse, an die die Suite eine Mail schickt. Mit diesen Stellen brauchst du die Verträge, und die Suite ändert daran nichts. Welche das typischerweise sind und wo deren Vertragstexte liegen, steht [unten](#mit-wem-du-selbst-avvs-brauchst).

## Wann doch ein AVV mit dem Addon-Anbieter entsteht

Zuerst der Punkt, der die Frage sonst offen ließe: **Die Addons funken nichts nach Hause.** Für diese Seite wurde der Quellcode aller 24 Pakete (Stand 01.09.2026, ohne `vendor/` und Tests) nach ausgehenden HTTP-Aufrufen durchsucht. Es gibt keinen Lizenz-Ping, keine Telemetrie, keinen Update-Check und kein Fehlerreporting an einen Server des Anbieters. Jeder ausgehende Aufruf im Code geht an einen Dienst, den du selbst konfigurierst und dessen Zugangsdaten du selbst einträgst: Mollie, Brevo, HubSpot, Cal.com, Slack, Anthropic für die KI-Aktion in Automations, oder eine URL, die du im Webhook Manager oder in einem Automations-Knoten eingibst. Ohne Schlüssel oder URL findet der jeweilige Aufruf nicht statt. Ein Sonderfall ist die VocalFlow-Integration in Automations: sie ruft eine `partner_url` an, die du selbst einträgst, und läuft ohne URL und Secret nicht. Zeigt diese URL auf eine von Adrian Goldner betriebene VocalFlow-Instanz, verarbeitet er dort Daten deiner Kontakte, und für diesen Dienst brauchst du einen AVV. Das Öffnungs-Tracking in Marketing läuft über eine Route deiner eigenen Site (`/o/{uuid}.gif`), die Daten bleiben in deiner Datenbank. Der Standard, nach dem die Addons gebaut werden, schließt Telemetrie ausdrücklich aus, auch anonyme und auch mit Opt-out.

Die kommerziellen Addons lösen ihre Lizenz über Statamics eigenes Lizenzsystem auf, so wie deine Statamic-Pro-Lizenz auch (siehe [Licensing](/guide/licensing)). Dieser Abgleich ist eine Funktion von Statamic Core und läuft zwischen deiner Installation und Statamic; die Addons fügen ihm keinen eigenen Aufruf hinzu. Welche Daten Statamic dabei übermittelt, dokumentiert Statamic selbst; das ist für diese Seite nicht geprüft.

Damit bleiben drei Fälle, in denen Adrian Goldner tatsächlich personenbezogene Daten für dich verarbeitet und ein AVV nötig wird:

1. **Support mit Datenzugriff.** Du gibst zur Fehlersuche Zugang zu deiner Installation, etwa per SSH, als Control-Panel-Nutzer oder durch Übergabe eines Datenbank-Dumps oder eines Logauszugs mit Kundendaten. In dem Moment sieht der Anbieter Daten deiner Kontakte und Käufer, im Zweifel auch solche, die für den Fehler gar nicht relevant sind. Ein Support-Ticket, in dem nur Konfiguration, Stacktraces ohne Personenbezug oder Testdaten ausgetauscht werden, löst das nicht aus.
2. **Betrieb durch den Anbieter.** Du beauftragst Adrian Goldner damit, deine Statamic-Installation zu hosten, zu warten oder Backups zu halten. Dann liegen die Daten auf Infrastruktur, die er verwaltet, und er ist Auftragsverarbeiter im vollen Sinn, mit dem Hoster als weiterem Auftragsverarbeiter.
3. **Individuelle Entwicklung an Produktivdaten.** Du lässt eine Erweiterung oder Migration direkt auf deiner Produktivinstallation bauen, statt in einer Kopie mit Testdaten.

Für alle drei Fälle ist die folgende Vorlage gedacht. Für den Normalfall, Composer-Installation und Betrieb auf deinem eigenen Server, ist sie nicht nötig.

## Vorlage nach Art. 28 Abs. 3 DSGVO

Die Vorlage deckt die Pflichtinhalte aus Art. 28 Abs. 3 Satz 2 lit. a bis h DSGVO ab. Sie ist für den Fall gedacht, dass einer der drei Fälle oben eintritt. Für den umgekehrten Fall, deine eigenen Auftragsverarbeiter, verwende deren Vertragstexte; die sind auf deren Infrastruktur zugeschnitten und du hast auf den Wortlaut ohnehin keinen Einfluss.

Felder in eckigen Klammern sind auszufüllen. Wo eine Klausel offen bleibt, steht das dabei.

::: details Vorlage anzeigen

**Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO**

zwischen

[Name, Rechtsform, Anschrift des Lizenznehmers]
(im Folgenden „Verantwortlicher")

und

Adrian Goldner, [Anschrift]
(im Folgenden „Auftragsverarbeiter")

**§ 1 Gegenstand und Dauer**

(1) Der Auftragsverarbeiter erbringt für den Verantwortlichen folgende Leistung: [Supportleistung mit Zugriff auf die Statamic-Installation des Verantwortlichen / Betrieb und Wartung der Statamic-Installation auf einem vom Auftragsverarbeiter verwalteten Server / andere Leistung]. Soweit dabei personenbezogene Daten verarbeitet werden, geschieht dies nach dieser Vereinbarung.

(2) Die Vereinbarung gilt ab dem [Datum] und endet [mit Abschluss des Support-Vorgangs / mit Ende des Betriebsvertrags vom Datum / am Datum]. Die Pflichten aus § 9 (Löschung und Rückgabe) und § 4 (Vertraulichkeit) bestehen über das Ende hinaus fort.

**§ 2 Art und Zweck der Verarbeitung**

(1) Zweck der Verarbeitung ist ausschließlich die Erbringung der in § 1 genannten Leistung.

(2) Art der Verarbeitung: [Einsichtnahme in Datenbank und Dateisystem zur Fehlersuche / Ausführen von Wartungsbefehlen / Anlegen von Backups / Speicherung und Bereitstellung auf dem Server]. Eine Verarbeitung zu eigenen Zwecken des Auftragsverarbeiters findet nicht statt.

**§ 3 Datenarten und betroffene Personen**

(1) Datenarten: [Zutreffendes ankreuzen oder ergänzen]
- Stammdaten von Kontakten (Name, E-Mail-Adresse, Telefon, Unternehmen)
- Abonnementdaten (Listen, Einwilligungsstatus, Zeitstempel der Bestätigung)
- Zahlungsdaten (Name, E-Mail, Land, Betrag, Zahlungsreferenz; keine vollständigen Kartendaten)
- Rechnungsdaten (Name, Anschrift, Rechnungsnummer, Beträge)
- Nutzungsdaten (Aktivitätsereignisse, grobe Gerätekategorie)
- Einwilligungsnachweise (Kategorie, Zeitpunkt, Version des Banners)
- Zugangsdaten zum Control Panel des Verantwortlichen

(2) Betroffene Personen: [Zutreffendes ankreuzen oder ergänzen]
- Kunden und Interessenten des Verantwortlichen
- Newsletter-Abonnenten
- Website-Besucher
- Mitarbeiter und Control-Panel-Nutzer des Verantwortlichen

**§ 4 Weisungsgebundenheit**

(1) Der Auftragsverarbeiter verarbeitet personenbezogene Daten nur auf dokumentierte Weisung des Verantwortlichen, auch in Bezug auf eine Übermittlung in ein Drittland oder an eine internationale Organisation, es sei denn, er ist nach dem Recht der Union oder eines Mitgliedstaats dazu verpflichtet. In diesem Fall teilt er dem Verantwortlichen die Verpflichtung vor der Verarbeitung mit, sofern das Recht dies nicht verbietet.

(2) Weisungen erteilt der Verantwortliche in Textform. Als Weisung gilt auch der Auftrag, der die Leistung nach § 1 auslöst, etwa ein Support-Ticket, in dem der Verantwortliche den Zugriff einräumt.

(3) Hält der Auftragsverarbeiter eine Weisung für rechtswidrig, weist er den Verantwortlichen unverzüglich darauf hin. Er darf die Ausführung bis zur Bestätigung durch den Verantwortlichen aussetzen.

**§ 5 Vertraulichkeit**

Der Auftragsverarbeiter gewährleistet, dass sich alle Personen, die zur Verarbeitung befugt sind, zur Vertraulichkeit verpflichtet haben oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen. Derzeit verarbeitet der Auftragsverarbeiter die Daten persönlich; werden weitere Personen einbezogen, gilt § 7.

**§ 6 Technische und organisatorische Maßnahmen**

(1) Der Auftragsverarbeiter trifft die Maßnahmen nach Art. 32 DSGVO. Sie sind in **Anlage 1** beschrieben. Der Auftragsverarbeiter darf die Maßnahmen weiterentwickeln, solange das Schutzniveau nicht unterschritten wird.

(2) Für den Fall des Betriebs durch den Auftragsverarbeiter enthält Anlage 1 mindestens: Zugriffssteuerung auf den Server (Schlüssel statt Passwort, benannte Konten), Verschlüsselung der Übertragung, Backup-Rhythmus und Backup-Ort, Protokollierung administrativer Zugriffe, Verfahren zur Wiederherstellung.

(3) Für den Fall des Supports mit Datenzugriff enthält Anlage 1 mindestens: Art des Zugangs (SSH-Schlüssel, temporärer CP-Nutzer), Beschränkung auf den zur Fehlersuche nötigen Umfang, Beendigung des Zugangs nach Abschluss, keine Kopie von Produktivdaten auf Geräte des Auftragsverarbeiters ohne gesonderte Weisung.

**§ 7 Weitere Auftragsverarbeiter**

(1) Der Verantwortliche erteilt eine allgemeine Genehmigung für die in **Anlage 2** genannten weiteren Auftragsverarbeiter. [Im Fall des Betriebs durch den Auftragsverarbeiter: der Hoster des Servers, mit Name, Anschrift, Leistung.]

(2) Der Auftragsverarbeiter informiert den Verantwortlichen über jede beabsichtigte Änderung in Bezug auf die Hinzuziehung oder Ersetzung weiterer Auftragsverarbeiter mit einer Frist von [vier Wochen]. Der Verantwortliche kann in dieser Frist aus wichtigem Grund Einspruch erheben.

(3) Mit jedem weiteren Auftragsverarbeiter schließt der Auftragsverarbeiter einen Vertrag, der diesem dieselben Datenschutzpflichten auferlegt wie diese Vereinbarung.

**§ 8 Unterstützungspflichten**

(1) Der Auftragsverarbeiter unterstützt den Verantwortlichen mit geeigneten technischen und organisatorischen Maßnahmen dabei, Anfragen betroffener Personen nach Kapitel III DSGVO zu beantworten, soweit das aufgrund der Art der Verarbeitung möglich ist. Für die Suite bedeutet das: Auskunft, Export und Löschung laufen über die Funktionen, die die Addons dafür bereitstellen (siehe [Privacy & retention](/guide/privacy)); der Auftragsverarbeiter greift nur ein, wenn diese Funktionen im konkreten Fall nicht reichen.

(2) Der Auftragsverarbeiter unterstützt den Verantwortlichen bei der Einhaltung der Pflichten aus Art. 32 bis 36 DSGVO. Eine Verletzung des Schutzes personenbezogener Daten, die den Auftragsverarbeiter betrifft, meldet er dem Verantwortlichen unverzüglich, spätestens innerhalb von [24 Stunden] nach Kenntnis, mit den Angaben nach Art. 33 Abs. 3 DSGVO, soweit sie ihm vorliegen.

**§ 9 Löschung und Rückgabe**

(1) Nach Abschluss der Leistung löscht der Auftragsverarbeiter alle personenbezogenen Daten, die er im Rahmen der Leistung erhalten oder erzeugt hat (Kopien, Logauszüge, Backups auf eigenen Systemen), oder gibt sie nach Wahl des Verantwortlichen zurück, sofern nicht Unionsrecht oder das Recht eines Mitgliedstaats eine Aufbewahrung verlangt.

(2) Im Fall des Betriebs durch den Auftragsverarbeiter erhält der Verantwortliche vor der Löschung eine vollständige Kopie von Datenbank und Dateisystem in einem gängigen Format. Die Löschung erfolgt [30 Tage] nach Übergabe, es sei denn, der Verantwortliche bestätigt den Empfang früher.

(3) Der Auftragsverarbeiter bestätigt die Löschung in Textform.

**§ 10 Nachweise und Überprüfungen**

(1) Der Auftragsverarbeiter stellt dem Verantwortlichen alle erforderlichen Informationen zum Nachweis der Einhaltung der Pflichten aus Art. 28 DSGVO zur Verfügung.

(2) Der Verantwortliche kann Überprüfungen durchführen oder durch einen beauftragten Prüfer durchführen lassen. Sie werden mit angemessener Frist angekündigt, finden zu üblichen Geschäftszeiten statt und beschränken sich auf das, was zur Prüfung dieser Vereinbarung nötig ist. Der Auftragsverarbeiter kann stattdessen aktuelle Nachweise vorlegen (Dokumentation der Maßnahmen, Prüfberichte des Hosters), soweit sie die Frage beantworten.

**§ 11 Haftung**

[Offen. Die Parteien regeln die Haftung im Hauptvertrag oder hier. Art. 82 DSGVO bleibt unberührt. Prüfen: ob eine Haftungsbegrenzung im Verhältnis zum Verantwortlichen zulässig ist, und in welcher Höhe.]

**§ 12 Schlussbestimmungen**

(1) Bei Widersprüchen zwischen dieser Vereinbarung und dem Hauptvertrag geht in Datenschutzfragen diese Vereinbarung vor.

(2) Änderungen bedürfen der Textform.

(3) Es gilt deutsches Recht. [Gerichtsstand: prüfen, ob eine Vereinbarung zulässig ist; bei Kaufleuten üblich.]

**Anlage 1: Technische und organisatorische Maßnahmen** [auszufüllen, siehe § 6]

**Anlage 2: Genehmigte weitere Auftragsverarbeiter** [auszufüllen, siehe § 7]

[Ort, Datum, Unterschrift Verantwortlicher] · [Ort, Datum, Unterschrift Auftragsverarbeiter]

:::

## Mit wem du selbst AVVs brauchst

Die Liste nennt die Dienste, die eine typische Installation der Suite anbindet, und verlinkt die Vertragsseite des Anbieters, soweit sie am 01.09.2026 öffentlich erreichbar war. Ob ein Dienst in deinem Fall Auftragsverarbeiter ist oder eigener Verantwortlicher, sagt dir dessen Vertragstext; bei Zahlungsdienstleistern ist es in der Regel beides, je nach Datensatz.

| Dienst | Rolle in der Suite | Vertragstext |
| --- | --- | --- |
| Mollie | Zahlungsanbieter für [Payments](/payments/) | [Data processing agreement](https://www.mollie.com/de/legal/data-processing-agreement) |
| Stripe | Zahlungsanbieter für [Payments](/payments/) | [Datenverarbeitungsvereinbarung](https://stripe.com/de/legal/dpa) |
| Brevo | SMTP- oder API-Versand für [Marketing](/marketing/) und [Notifications](/notifications/) | [Terms of Service, Appendix 3: Data Processing Agreement](https://www.brevo.com/legal/termsofuse/#appendix-3-data-processing-agreement-dpa) |
| MailerLite | Newsletter-Versand, wenn statt Marketing genutzt | [Data Processing Addendum](https://www.mailerlite.com/legal/data-processing-agreement) |
| Scaleway | Hosting, Transactional Email | [Contracts, dort „Data Processing Agreement" als PDF](https://www.scaleway.com/en/contracts/) |
| Hetzner | Hosting | Keine öffentliche URL verifiziert. Der Vertrag wird nach Hetzners Angaben im Kundenkonto geschlossen; prüfen. |

Was hier fehlt, weil es von deiner Installation abhängt: der Anbieter deiner Statamic-Installation selbst, wenn du sie nicht selbst betreibst (Agentur, Laravel Forge, Ploi), ein externer Backup-Dienst, ein Analyse-Werkzeug, und jeder Webhook-Empfänger, den du im [Webhook Manager](/webhook-manager/) einträgst und der personenbezogene Daten bekommt.

## Was in deine Datenschutzerklärung gehört

Der AVV ist die eine Seite, die Information der Betroffenen nach Art. 13 DSGVO die andere. Was die Addons speichern und was sie bewusst nicht speichern, steht in [Privacy & retention](/guide/privacy); für die Steuerdaten in Payments und Invoices in [Tax facts and retention](/payments/tax-and-retention). Die Pflichtangaben für den Verkauf selbst sind in der [Handreichung Pflichtangaben](/guide/pflichtangaben) zusammengestellt.
