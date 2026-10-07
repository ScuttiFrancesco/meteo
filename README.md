# Meteo Alert

App Ionic/Angular per consultare il meteo dei luoghi preferiti, distribuita come app Android tramite Capacitor. In background l'app scarica le previsioni e manda una notifica agli orari scelti dall'utente.

## Come funziona

| Parte | Tecnologia | Compito |
|---|---|---|
| Interfaccia | Angular 22 + Ionic 9 | Ricerca dei luoghi, preferiti, previsioni ([Open-Meteo](https://open-meteo.com)) |
| Contenitore nativo | Capacitor 8 (`android/`) | Impacchetta la build web in un'app Android |
| Lavoro in background | `@capacitor/background-runner` | Ogni ~30 minuti scarica le previsioni e programma le notifiche |
| Database locale | `@capacitor-community/sqlite` | Dati dell'app (accessibile solo dall'app, non dal runner) |

### Notifiche a orario

Gli orari delle notifiche si impostano dalla pagina **Notifications** del menu e restano salvati nel `localStorage` (al primo avvio `08:00` e `17:00`). La località è quella del preferito selezionato.

Il Background Runner **non** può partire a un orario preciso. Android lo esegue "circa" ogni `interval` minuti (minimo 15), quando gli conviene. Per avere una notifica alle 8:00 si combinano due meccanismi:

1. **Il runner (periodico, impreciso):** scarica le previsioni e programma la notifica delle 8:00 con `CapacitorNotifications.schedule({ scheduleAt })`. Ogni esecuzione sostituisce la notifica programmata (stesso `id`) con dati più freschi.
2. **AlarmManager di Android (preciso):** alle 8:00 mostra la notifica, anche con lo schermo bloccato.

Ne derivano alcune conseguenze:

- **Allarmi esatti.** Senza il permesso per gli allarmi esatti, Android può ritardare la notifica anche di parecchi minuti. Vedi il passo 3b.
- **Dati non freschissimi.** Il contenuto della notifica risale all'ultima esecuzione del runner, quindi può avere da qualche minuto a qualche ora (di notte Android esegue il runner più di rado).
- **Senza rete.** Il runner usa le ultime previsioni scaricate, finché coprono il giorno della notifica (3 giorni).
- **Telefono spento all'orario della notifica.** La notifica è persa e non viene recuperata all'accensione. Lo spegnimento cancella gli allarmi programmati, mentre il runner sopravvive al riavvio: alla prima esecuzione dopo l'accensione (entro circa `interval` minuti) programma l'orario successivo. Esempio: spento alle 8:00 e riacceso alle 10:00, la notifica delle 8:00 salta e quella delle 17:00 arriva regolarmente.
- **Arresto forzato.** Con *Impostazioni > App > Meteo Alert > Arresto forzato*, Android cancella allarmi e runner finché non riapri l'app. Alcune marche (Xiaomi, Huawei…) fanno lo stesso quando chiudi l'app dalle recenti, se non attivi l'avvio automatico.

## Prerequisiti

Vedi [requirements.txt](requirements.txt). In breve: Node.js ≥ 22.22.3, JDK 21, Android Studio con SDK API 36.

## Setup su un nuovo PC (clone del repository)

La cartella `android/` è già nel repository, quindi bastano:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

`npm install` applica anche la patch del plugin (passo f): nell'output deve comparire `@capacitor/background-runner@3.0.0 ✔`.

**Non** eseguire `npx cap add android`: serve solo la prima volta, quando `android/` non esiste ancora.

---

## Passaggi di configurazione (storico, da fare una volta sola)

Questa sezione descrive come è stato configurato il progetto, nell'ordine in cui va fatto.

### 1. Capacitor nel progetto

```bash
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init "Meteo Alert" "it.fra.meteoalert" --web-dir www
```

L'`appId` (`it.fra.meteoalert`) diventa il package name Android. Cambiarlo dopo aver generato `android/` è complicato.

Il `webDir` deve puntare alla cartella che contiene `index.html` dopo la build. In questo progetto `angular.json` ha `outputPath: { base: "www", browser: "" }`, quindi `index.html` finisce direttamente in `www/`.

### 2. Piattaforma Android

```bash
npm install @capacitor/android
npm run build
npx cap add android
```

`cap add` crea `android/`, un progetto Android Studio completo. I comandi successivi (`cap sync`) lo aggiornano senza sovrascrivere le modifiche manuali, quindi va messo sotto git.

### 3. Plugin e modifiche native

```bash
npm install @capacitor/background-runner @capacitor-community/sqlite
npx cap sync android
```

#### a) `android/app/build.gradle`

Nel blocco `repositories` aggiungere la cartella delle librerie del Background Runner:

```gradle
repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
        dirs '../../node_modules/@capacitor/background-runner/android/src/main/libs', 'libs'
    }
}
```

#### b) `android/app/src/main/AndroidManifest.xml`

Nella sezione `<!-- Permissions -->`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

- `POST_NOTIFICATIONS`: obbligatorio da Android 13 per mostrare notifiche.
- `SCHEDULE_EXACT_ALARM`: allarmi esatti su Android 12 e 13, dove il permesso è concesso automaticamente. Da Android 14 parte disattivato e l'utente dovrebbe attivarlo a mano in *Impostazioni > App > Meteo Alert > Sveglie e promemoria*.
- `USE_EXACT_ALARM`: allarmi esatti da Android 13 in poi, concesso automaticamente e non revocabile. Così non serve nessuna impostazione manuale.

> **Attenzione:** Google Play accetta `USE_EXACT_ALARM` solo per app di sveglie e calendari. Per un'APK installata a mano va benissimo. Se un giorno pubblichi sul Play Store, toglilo e chiedi all'utente di attivare "Sveglie e promemoria".

#### c) `capacitor.config.ts`

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.fra.meteoalert',
  appName: 'Meteo Alert',
  webDir: 'www',
  plugins: {
    BackgroundRunner: {
      label: 'it.fra.meteoalert.check',
      src: 'runners/runner.js',
      event: 'checkMeteo',
      repeat: true,
      interval: 30,      // minuti, minimo 15
      autoStart: true,
    },
  },
};

export default config;
```

- `label` identifica il runner. Deve essere identico a `RUNNER_LABEL` in `notification.service.ts` (passo e).
- `src` è un percorso relativo a `www/`.
- `interval` decide quanto sono aggiornati i dati nella notifica. 30 minuti è un compromesso tra freschezza e batteria.

Dopo ogni modifica a questo file serve `npx cap sync android`.

#### d) Il file del runner

Il runner sta in `src/runners/runner.js`. Perché finisca in `www/runners/` durante la build, aggiungere questa voce agli `assets` di `angular.json` (in `architect > build > options`):

```json
{ "glob": "**/*", "input": "src/runners", "output": "runners" }
```

Il runner gira in un motore JavaScript separato dalla WebView. Non può usare Angular, `localStorage` o SQLite, ma ha a disposizione `fetch`, `CapacitorKV` (chiave/valore), `CapacitorNotifications` e poche altre API. I dati che gli servono (località, orari) glieli passa l'app con `dispatchEvent`, e il runner li salva in `CapacitorKV`.

[src/runners/runner.js](src/runners/runner.js) gestisce tre eventi:

| Evento | Chi lo invia | Cosa fa |
|---|---|---|
| `saveSettings` | L'app, all'avvio e quando cambia il preferito | Salva località e orari in `CapacitorKV` e programma subito le notifiche |
| `clearSettings` | L'app, quando non c'è un preferito selezionato | Cancella le impostazioni e annulla le notifiche già programmate |
| `checkMeteo` | Android, circa ogni `interval` minuti | Riscarica le previsioni e riprogramma le notifiche con dati freschi |

Ogni notifica confronta l'ora in cui arriva con la stessa ora del giorno prima, nel formato `ieri → oggi`:

```
Meteo Milano · ieri → oggi
Meteo: Nuvoloso → Pioggia leggera
Temperatura: 22° → 18°
Percepita: 20° → 19°
Vento: 9 km/h NO → 5 km/h SO
```

- Il runner usa i dati dell'ora piena: alle 8:30 quelli delle 8:00. Per avere anche ieri scarica le previsioni con `past_days=1`.
- Chiusa, la notifica mostra una riga sola con temperatura e meteo. Espansa, mostra le quattro righe, ma solo con la patch del plugin (passo f).
- La condizione meteo (Sereno, Nuvoloso, Pioggia leggera…) usa le stesse soglie di `getMeteoCondition` in [meteo-icons.ts](src/app/shared/meteo-icons.ts). Se le cambi in un file, cambiale anche nell'altro.
- La direzione del vento è quella da cui arriva, in 8 punti cardinali con le sigle italiane (N, NE, E, SE, S, SO, O, NO). L'app usa le sigle inglesi, con la stessa logica di `windDirection` in [wind.ts](src/app/shared/wind.ts).

Le previsioni scaricate restano in `CapacitorKV` come riserva quando manca la rete.

Il plugin non ha un'API per annullare una notifica programmata: il runner la riprogramma con lo stesso `id` al 2100.

> **Nota sul fuso orario:** nella versione 3.0.0 del plugin, Android legge `scheduleAt` come ora **locale del telefono** e ignora la `Z` finale (vedi `Notification.kt` nel plugin). Una data JavaScript normale, che `toISOString()` scrive in UTC, farebbe quindi partire la notifica 1-2 ore prima in Italia. Per questo il runner costruisce una stringa che contiene già l'ora locale (`2026-10-08T08:00:00.000Z` vuol dire "alle 8:00 sul telefono"). Il runner presuppone che la località sia nello stesso fuso orario del telefono. Se aggiorni il plugin, ricontrolla questo comportamento.

#### e) Lato Angular: permessi e impostazioni

[NotificationService](src/app/core/services/notification.service.ts) parte con `AppComponent` e tiene aggiornato il runner:

- prende latitudine e longitudine dal geocoding (Nominatim) del preferito selezionato, quello avviato dalla home;
- prende gli orari scelti nella pagina Notifications ([NotificationsComponent](src/app/folder/notifications.component.ts)), salvati da `StorageService` nel `localStorage`;
- chiede il permesso per le notifiche (obbligatorio da Android 13, il popup compare solo la prima volta);
- invia tutto al runner con `BackgroundRunner.dispatchEvent`.

Nel browser (`npm start`) il servizio non fa nulla, perché il runner esiste solo nell'app Android.

Per cambiare gli orari basta aggiungerli o eliminarli dalla pagina Notifications (formato `HH:mm`, ora del telefono): il runner viene aggiornato subito, senza rifare build e sync.

#### f) Patch del plugin: notifiche espanse

La versione 3.0.0 del Background Runner dichiara l'opzione `largeBody` (testo su più righe quando la notifica è espansa), ma su Android la ignora: non la legge e non applica lo stile `BigTextStyle`. Senza correzione il testo resta su una riga sola, troncato.

```bash
npm install -D patch-package
```

La correzione sta in [patches/@capacitor+background-runner+3.0.0.patch](patches/@capacitor+background-runner+3.0.0.patch). `patch-package` la applica dopo ogni `npm install`, grazie allo script `postinstall` in `package.json`. Android Studio compila il plugin direttamente da `node_modules/` (vedi `android/capacitor.settings.gradle`), quindi basta la solita build.

- `.gitattributes` tiene la patch con fine riga LF. Con `core.autocrlf=true` Git la convertirebbe in CRLF, e la patch metterebbe righe CRLF nei file Kotlin del plugin.
- Quando aggiorni il plugin, `npm install` avvisa se la patch non si applica più. Controlla se la nuova versione ha già corretto il problema: in quel caso cancella la patch.
- Per modificare la patch, cambia i file in `node_modules/@capacitor/background-runner/android/` e rigenerala con `npx patch-package @capacitor/background-runner`. Prima cancella le cartelle `android/build` e `android/.gradle` dentro il plugin. Sono cache di Gradle e si rigenerano, ma su Windows i loro percorsi troppo lunghi fanno fallire il comando, e l'opzione `--exclude` non funziona.

---

## Ciclo di lavoro

Ogni volta che vuoi provare sul telefono:

```bash
npm run build
npx cap sync android
npx cap open android      # solo la prima volta, poi Android Studio resta aperto
```

`cap sync` copia `www/` dentro il progetto Android e aggiorna i plugin nativi. Va rilanciato dopo ogni build, dopo ogni `npm install` di un plugin e dopo ogni modifica a `capacitor.config.ts`.

In Android Studio seleziona il telefono collegato in alto e premi **Run ▶**. In alternativa `npx cap run android` fa tutto da terminale.

**Live reload** (richiede la Ionic CLI, vedi requirements.txt): `ionic cap run android -l --external`, con PC e telefono sulla stessa rete Wi-Fi. Le modifiche Angular compaiono al volo, quelle a `runner.js` no: il runner viene sempre letto dal bundle, quindi serve il giro completo build + sync.

## Debug

- **Prima apertura in Android Studio:** Gradle scarica le dipendenze. Aspetta che finisca "Gradle sync" in basso prima di premere Run. Se manca l'SDK API 36, Android Studio propone di installarlo.
- **Angular:** apri `chrome://inspect` in Chrome sul PC per avere console e DevTools della WebView.
- **Runner:** i suoi `console.log` compaiono in **Logcat** (Android Studio), non in Chrome. Filtra per `it.fra.meteoalert`.
- **Notifiche programmate:** per vedere gli allarmi in coda, con il telefono collegato:
  ```bash
  adb shell dumpsys alarm | findstr meteoalert
  ```

## Testare le notifiche

Non aspettare il giro periodico. Durante lo sviluppo:

1. `npm run build`, poi `npx cap sync android`, poi Run da Android Studio.
2. Con un preferito selezionato, apri la home, poi dalla pagina Notifications aggiungi un orario fra 5 minuti (es. `10:42`).
3. In Logcat deve comparire `[runner] programmate N notifiche`.
4. Chiudi l'app e blocca lo schermo.
5. La notifica deve arrivare all'orario preciso. Se arriva con 1-2 ore di anticipo, è il problema del fuso orario descritto sopra.
6. Espandi la notifica: deve mostrare le quattro righe `ieri → oggi`. Se resta su una riga, la patch del plugin non è applicata (passo f).

Finito il test, elimina l'orario di prova dalla pagina Notifications: il runner annulla da solo la notifica programmata.

Per forzare un giro periodico senza aspettare Android, dalla console di `chrome://inspect`:

```js
await Capacitor.Plugins.BackgroundRunner.dispatchEvent({ label: 'it.fra.meteoalert.check', event: 'checkMeteo', details: {} });
```

## Generare l'APK

- **APK di debug:** *Build > Build App Bundle(s) / APK(s) > Build APK(s)*. Il file finisce in `android/app/build/outputs/apk/debug/`.
- **APK firmato:** *Build > Generate Signed App Bundle or APK > APK*. Crea un keystore e conservalo con cura, **fuori dal repository**, con una copia di backup.

Scegli un tipo di firma e non cambiarlo più. Android rifiuta un aggiornamento firmato con una chiave diversa: dovresti disinstallare l'app, e la disinstallazione cancella il database SQLite. L'APK di debug è firmato con una chiave legata al PC, quindi cambiando computer ti trovi nella stessa situazione. Per un'app da tenere a lungo conviene un keystore tuo.

## Sul telefono

- **Installazione:** con il telefono collegato via USB, Run installa l'app. Altrimenti copia l'APK sul telefono e consenti "Installa app sconosciute" per il file manager.
- **Permesso notifiche:** al primo avvio accetta la richiesta.
- **Allarmi esatti:** con `USE_EXACT_ALARM` non serve fare nulla. Per verificarlo: *Impostazioni > App > Meteo Alert > Sveglie e promemoria*, se la voce è presente deve risultare consentita.
- **Batteria:** *Impostazioni > App > Meteo Alert > Batteria > Senza restrizioni*. Su Xiaomi, Huawei e simili attiva anche l'avvio automatico. Istruzioni per marca su [dontkillmyapp.com](https://dontkillmyapp.com).

## Cosa va su git

**Da committare:**

- `src/`, compreso `src/runners/runner.js`
- `patches/` e `.gitattributes` (patch del plugin, passo f)
- `angular.json`, `package.json`, `package-lock.json`, `capacitor.config.ts`, `ionic.config.json`, `tsconfig*.json`
- `README.md`, `requirements.txt`
- `android/`: tutto quello che non è escluso da `android/.gitignore`, cioè file Gradle, wrapper `gradlew`, `AndroidManifest.xml`, `MainActivity`, icone e risorse in `res/`

**Da non committare** (già esclusi dai `.gitignore`):

| Percorso | Motivo |
|---|---|
| `node_modules/` | Si ricrea con `npm install` |
| `www/`, `.angular/` | Output della build e cache di Angular |
| `android/app/src/main/assets/` | Copia di `www/` e config generate da `cap sync` |
| `android/app/src/main/res/xml/config.xml` | Generato da `cap sync` |
| `android/capacitor-cordova-android-plugins/` | Generato da `cap sync` |
| `android/.gradle/`, `android/app/build/` | Cache e output di Gradle |
| `android/local.properties` | Percorso dell'SDK sul tuo PC |
| `*.apk`, `*.aab` | File compilati |
| `*.jks`, `*.keystore` | Chiave di firma: **mai** su GitHub |
