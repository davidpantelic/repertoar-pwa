<script setup lang="ts">
const { locale } = useI18n();
</script>

<template>
  <main class="policy-terms text-center">
    <h1>{{ $t("privacyPolicy.title") }}</h1>
    <br />
    <p>
      {{ $t("words.lastUpdate") }}:
      <b>{{ $d(new Date("2026-02-25"), "numeric") }}</b>
    </p>
    <p>
      {{ $t("words.appName") }}: <strong>{{ $t("appInfo.name") }}</strong>
    </p>
    <p>
      {{ $t("words.contact") }}:
      <a href="mailto:info@webdak.rs" class="hover:underline"
        ><strong>info@webdak.rs</strong></a
      >
    </p>

    <br />

    <div v-if="locale == 'en'" class="flex flex-col gap-1 text-left">
      <p class="text-center">
        This Privacy Policy explains how
        <strong>{{ $t("appInfo.name") }}</strong> collects, uses, stores, and
        shares personal data when you use the application.
      </p>

      <h2>1. Data We Collect</h2>
      <h3>1.1 Account and profile data</h3>
      <p>When you create or use an account, we may process:</p>
      <ul>
        <li><p>email address</p></li>
        <li>
          <p>authentication provider information (for example, Google)</p>
        </li>
        <li><p>profile metadata such as display name / full name</p></li>
        <li><p>profile image URL (if provided by provider)</p></li>
        <li><p>language preference</p></li>
      </ul>

      <h3>1.2 Authentication and security data</h3>
      <p>To provide secure login and session management, we process:</p>
      <ul>
        <li>
          <p>authentication session/token data handled by Supabase Auth</p>
        </li>
        <li><p>password-reset and email-confirmation flow data</p></li>
        <li>
          <p>
            session security events (for example, logout-other-devices events)
          </p>
        </li>
      </ul>

      <h3>1.3 App content data</h3>
      <p>If you create app records/content, we process:</p>
      <ul>
        <li>
          <p>
            record fields you submit (for example title/body and related
            metadata)
          </p>
        </li>
        <li>
          <p>
            ownership identifier (`user_id`) to enforce per-user access control
          </p>
        </li>
      </ul>

      <h3>1.4 Push notification data (if enabled by you)</h3>
      <p>If you enable push notifications, we store:</p>
      <ul>
        <li>
          <p>push subscription endpoint</p>
        </li>
        <li>
          <p>push keys (`p256dh`, `auth`)</p>
        </li>
        <li>
          <p>subscription payload required by web push protocol</p>
        </li>
      </ul>

      <h3>1.5 Local device data (browser/app storage)</h3>
      <p>
        For app functionality and offline support, we store data locally in your
        browser/device:
      </p>
      <ul>
        <li>
          <p>IndexedDB: app records and sync queue</p>
        </li>
        <li>
          <p>
            localStorage/sessionStorage: app preferences and UI state (for
            example selected language, install/update/offline flags, dark/light
            mode)
          </p>
        </li>
        <li>
          <p>optional cookie(s) related to install prompt behavior</p>
        </li>
      </ul>

      <h2>2. How We Use Data</h2>
      <p>We use your data to:</p>
      <ul>
        <li>
          <p>create and manage your account</p>
        </li>
        <li>
          <p>authenticate you and keep sessions secure</p>
        </li>
        <li>
          <p>let you create/read/update/delete your own records</p>
        </li>
        <li>
          <p>provide offline-first behavior and later sync</p>
        </li>
        <li>
          <p>send push notifications you requested</p>
        </li>
        <li>
          <p>operate, secure, and improve app reliability</p>
        </li>
      </ul>

      <h2>3. Legal Basis (GDPR-style, where applicable)</h2>
      <p>Depending on jurisdiction, processing is based on:</p>
      <ul>
        <li>
          <p>performance of a contract (providing app functionality)</p>
        </li>
        <li>
          <p>your consent (for example push notifications)</p>
        </li>
        <li>
          <p>
            legitimate interests (security, fraud prevention, service stability)
          </p>
        </li>
        <li>
          <p>legal obligations, where applicable</p>
        </li>
      </ul>

      <h2>4. Data Sharing and Processors</h2>
      <p>We use third-party infrastructure/providers to operate the app:</p>
      <ul>
        <li>
          <p><b>Supabase</b> (authentication, database, server functions)</p>
        </li>
        <li>
          <p><b>Google</b> (OAuth sign-in, when you choose Google login)</p>
        </li>
        <li>
          <p>
            <b>Hosting/Deployment provider</b> (for example Vercel), for app
            delivery
          </p>
        </li>
        <li>
          <p><b>Browser/OS push services</b> used by web push standards</p>
        </li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>5. Access Control</h2>
      <p>
        Your app data is protected by access rules (RLS) so authenticated users
        can access only their own records (by `user_id`) unless explicitly
        configured otherwise.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain data as long as needed to provide the service or until
        deletion is requested, including:
      </p>
      <ul>
        <li>
          <p>account and related profile data while account is active</p>
        </li>
        <li>
          <p>
            app records until you delete them or request account/data deletion
          </p>
        </li>
        <li>
          <p>push subscriptions until removed/expired/unsubscribed</p>
        </li>
        <li>
          <p>
            local device data until you clear app/browser storage or uninstall
          </p>
        </li>
      </ul>

      <h2>7. International Transfers</h2>
      <p>
        Your data may be processed in countries where our providers operate. We
        rely on provider safeguards where required.
      </p>

      <h2>8. Security</h2>
      <p>
        We apply reasonable technical and organizational measures, including
        authenticated access control and secure provider infrastructure. No
        system can guarantee absolute security.
      </p>

      <h2>9. Your Rights</h2>
      <p>Depending on your location, you may have rights to:</p>
      <ul>
        <li>
          <p>access your personal data</p>
        </li>
        <li>
          <p>correct inaccurate data</p>
        </li>
        <li>
          <p>request deletion</p>
        </li>
        <li>
          <p>object/restrict certain processing</p>
        </li>
        <li>
          <p>
            withdraw consent (for consent-based processing, e.g. notifications)
          </p>
        </li>
      </ul>
      <p>
        {{ $t("words.contact") }}:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>

      <h2>10. Children</h2>
      <p>
        <strong>{{ $t("appInfo.name") }}</strong> is not intended for children
        under 18 (or minimum age required by local law). We do not knowingly
        collect children’s data.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy. We will post the updated version with
        a new “Last updated” date.
      </p>

      <h2>12. Contact</h2>
      <p>
        If you have privacy questions or requests, contact:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>
    </div>

    <div v-if="locale == 'sr'" class="flex flex-col gap-1 text-left">
      <p class="text-center">
        Ova Politika privatnosti objašnjava kako
        <strong>{{ $t("appInfo.name") }}</strong> prikuplja, koristi, čuva i
        deli lične podatke kada koristite aplikaciju.
      </p>

      <h2>1. Podaci koje prikupljamo</h2>
      <h3>1.1 Podaci o nalogu i profilu</h3>
      <p>Kada kreirate nalog ili koristite aplikaciju, možemo obrađivati:</p>
      <ul>
        <li><p>email adresu</p></li>
        <li>
          <p>podatke o provajderu autentifikacije (na primer, Google)</p>
        </li>
        <li>
          <p>meta podatke profila, kao što su display name / full name</p>
        </li>
        <li>
          <p>URL profilne slike (ako je prosleđen od strane provajdera)</p>
        </li>
        <li><p>jezičke postavke</p></li>
      </ul>

      <h3>1.2 Podaci o autentifikaciji i bezbednosti</h3>
      <p>Radi bezbedne prijave i upravljanja sesijom, obrađujemo:</p>
      <ul>
        <li>
          <p>podatke o sesiji/tokenima koje obrađuje Supabase Auth</p>
        </li>
        <li>
          <p>podatke iz toka resetovanja lozinke i potvrde email adrese</p>
        </li>
        <li>
          <p>
            bezbednosne događaje sesije (na primer, odjavu sa drugih uređaja)
          </p>
        </li>
      </ul>

      <h3>1.3 Podaci o sadržaju aplikacije</h3>
      <p>Ako kreirate zapise/sadržaj u aplikaciji, obrađujemo:</p>
      <ul>
        <li>
          <p>
            polja zapisa koja pošaljete (na primer naslov/poruku i povezane
            metapodatke)
          </p>
        </li>
        <li>
          <p>
            identifikator vlasništva (<code>user_id</code>) radi kontrole
            pristupa po korisniku
          </p>
        </li>
      </ul>

      <h3>1.4 Podaci o push obaveštenjima (ako ih omogućite)</h3>
      <p>Ako omogućite push obaveštenja, čuvamo:</p>
      <ul>
        <li><p>endpoint push pretplate</p></li>
        <li>
          <p>push ključeve (<code>p256dh</code>, <code>auth</code>)</p>
        </li>
        <li>
          <p>payload pretplate potreban za web push protokol</p>
        </li>
      </ul>

      <h3>1.5 Lokalni podaci na uređaju (storage pretraživača/aplikacije)</h3>
      <p>
        Radi funkcionalnosti aplikacije i offline podrške, lokalno čuvamo
        podatke u vašem pretraživaču/uređaju:
      </p>
      <ul>
        <li>
          <p>IndexedDB: zapise aplikacije i red za sinhronizaciju</p>
        </li>
        <li>
          <p>
            localStorage/sessionStorage: podešavanja aplikacije i stanje UI-ja
            (na primer izabrani jezik, indikatore instalacije/ažuriranja/offline
            režima, tamni/svetli režim)
          </p>
        </li>
        <li>
          <p>opcionalne kolačiće povezane sa prikazom instalacionog prompta</p>
        </li>
      </ul>

      <h2>2. Kako koristimo podatke</h2>
      <p>Vaše podatke koristimo da:</p>
      <ul>
        <li><p>kreiramo i upravljamo vašim nalogom</p></li>
        <li><p>autentifikujemo korisnika i održavamo bezbednost sesije</p></li>
        <li>
          <p>omogućimo kreiranje/čitanje/izmenu/brisanje vaših zapisa</p>
        </li>
        <li><p>obezbedimo offline rad i naknadnu sinhronizaciju</p></li>
        <li><p>šaljemo push obaveštenja koja ste zatražili</p></li>
        <li><p>održavamo, štitimo i poboljšavamo pouzdanost aplikacije</p></li>
      </ul>

      <h2>3. Pravni osnov obrade (GDPR, gde je primenljivo)</h2>
      <p>U zavisnosti od jurisdikcije, obrada se zasniva na:</p>
      <ul>
        <li><p>izvršenju ugovora (pružanje funkcionalnosti aplikacije)</p></li>
        <li><p>vašem pristanku (na primer push obaveštenja)</p></li>
        <li>
          <p>
            legitimnom interesu (bezbednost, sprečavanje zloupotreba, stabilnost
            servisa)
          </p>
        </li>
        <li><p>zakonskim obavezama, gde je primenljivo</p></li>
      </ul>

      <h2>4. Deljenje podataka i obrađivači</h2>
      <p>
        Koristimo infrastrukturu/provajdere trećih strana za rad aplikacije:
      </p>
      <ul>
        <li>
          <p>
            <b>Supabase</b> (autentifikacija, baza podataka, server funkcije)
          </p>
        </li>
        <li>
          <p><b>Google</b> (OAuth prijava, kada izaberete Google prijavu)</p>
        </li>
        <li>
          <p>
            <b>Hosting/Deployment provajder</b> (na primer Vercel), za isporuku
            aplikacije
          </p>
        </li>
        <li>
          <p>
            <b>Browser/OS push servisi</b> koji se koriste u web push standardu
          </p>
        </li>
      </ul>
      <p>Ne prodajemo lične podatke.</p>

      <h2>5. Kontrola pristupa</h2>
      <p>
        Podaci u aplikaciji su zaštićeni pravilima pristupa (RLS), tako da
        autentifikovani korisnici pristupaju samo svojim zapisima (po
        <code>user_id</code>), osim ako nije izričito drugačije podešeno.
      </p>

      <h2>6. Čuvanje podataka</h2>
      <p>
        Podatke čuvamo onoliko dugo koliko je potrebno za pružanje usluge ili do
        zahteva za brisanje, uključujući:
      </p>
      <ul>
        <li><p>podatke naloga i profila dok je nalog aktivan</p></li>
        <li>
          <p>zapise aplikacije dok ih ne obrišete ili ne zatražite brisanje</p>
        </li>
        <li><p>push pretplate dok se ne uklone/isteknu/odjave</p></li>
        <li>
          <p>
            lokalne podatke na uređaju dok ne obrišete storage pretraživača ili
            ne deinstalirate aplikaciju
          </p>
        </li>
      </ul>

      <h2>7. Međunarodni prenos podataka</h2>
      <p>
        Vaši podaci mogu biti obrađivani u državama u kojima naši provajderi
        posluju. Gde je potrebno, oslanjamo se na odgovarajuće zaštitne mere.
      </p>

      <h2>8. Bezbednost</h2>
      <p>
        Primenjujemo razumne tehničke i organizacione mere, uključujući
        autentifikovani pristup i bezbednu infrastrukturu provajdera. Nijedan
        sistem ne može garantovati apsolutnu bezbednost.
      </p>

      <h2>9. Vaša prava</h2>
      <p>U zavisnosti od vaše lokacije, možete imati pravo da:</p>
      <ul>
        <li><p>pristupite svojim ličnim podacima</p></li>
        <li><p>ispravite netačne podatke</p></li>
        <li><p>zatražite brisanje</p></li>
        <li><p>prigovorite/ograničite određene obrade</p></li>
        <li>
          <p>
            povučete pristanak (za obradu zasnovanu na pristanku, npr.
            obaveštenja)
          </p>
        </li>
      </ul>
      <p>
        {{ $t("words.contact") }}:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>

      <h2>10. Deca</h2>
      <p>
        <strong>{{ $t("appInfo.name") }}</strong> nije namenjen deci mlađoj od
        18 godina (ili minimalne starosti propisane od strane lokalnog nadležnog
        organa). Svesno ne prikupljamo podatke dece.
      </p>

      <h2>11. Izmene ove Politike</h2>
      <p>
        Ovu Politiku privatnosti možemo povremeno ažurirati. Ažurirana verzija
        biće objavljena sa novim datumom „Poslednje ažuriranje“.
      </p>

      <h2>12. Kontakt</h2>
      <p>
        Ako imate pitanja ili zahteve u vezi privatnosti, kontaktirajte nas:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>
    </div>
  </main>
</template>
