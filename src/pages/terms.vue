<script setup lang="ts">
const { locale } = useI18n();
</script>

<template>
  <main class="policy-terms text-center">
    <h1>{{ $t("termsOfUse.title") }}</h1>
    <br />

    <p>
      {{ $t("words.lastUpdate") }}:
      <b>{{ $d(new Date("2026-04-01"), "numeric") }}</b>
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
        These Terms of Use govern your access to and use of
        <strong>{{ $t("appInfo.name") }}</strong
        >.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account or using this app, you agree to these Terms of
        Use and our Privacy Policy.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old, or the minimum age required by your
        local law, to use this app.
      </p>

      <h2>3. Accounts and Authentication</h2>
      <p>You are responsible for your account and login credentials.</p>
      <ul>
        <li><p>Keep your credentials secure.</p></li>
        <li>
          <p>Do not share your account access with unauthorized persons.</p>
        </li>
        <li>
          <p>
            You are responsible for actions performed through your account
            unless caused by our fault.
          </p>
        </li>
      </ul>

      <h2>4. User Content and Ownership</h2>
      <p>
        You retain ownership of content you create in the app (for example,
        songs, playlists, notes, and messages). You grant us the rights
        necessary to store, process, and sync that content to provide the
        service.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          <p>use the app for unlawful, harmful, or abusive activities,</p>
        </li>
        <li>
          <p>attempt unauthorized access to accounts, systems, or data,</p>
        </li>
        <li>
          <p>interfere with the app’s security, stability, or availability,</p>
        </li>
        <li><p>upload malware or malicious content.</p></li>
      </ul>

      <h2>6. Push Notifications</h2>
      <p>
        Push notifications are optional and require your device/browser
        permission. You can disable notifications in browser or system settings
        at any time.
      </p>

      <h2>7. Offline Mode and Sync</h2>
      <p>
        The app may store data locally (for example IndexedDB) and sync later
        when online. You are responsible for reviewing synced content and
        ensuring it is accurate.
      </p>

      <h2>8. Service Availability</h2>
      <p>
        We aim to keep the service available but do not guarantee uninterrupted
        operation. Maintenance, connectivity issues, third-party outages, or
        technical failures may affect availability.
      </p>

      <h2>9. Changes to the Service and Terms</h2>
      <p>
        We may update the app and these Terms from time to time. Continued use
        after updates means you accept the updated Terms.
      </p>

      <h2>10. Suspension and Termination</h2>
      <p>
        We may suspend or terminate access if you violate these Terms, use the
        app unlawfully, or create security risks.
      </p>

      <h2>11. Disclaimer of Warranties</h2>
      <p>
        The app is provided on an “as is” and “as available” basis, to the
        extent permitted by law, without warranties of any kind.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect,
        incidental, special, consequential, or punitive damages arising from use
        of the app.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms are governed by applicable laws of the Republic of Serbia,
        unless mandatory consumer law in your country of residence provides
        otherwise.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms, contact:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>
    </div>

    <div v-if="locale == 'sr'" class="flex flex-col gap-1 text-left">
      <p class="text-center">
        Ovi Uslovi korišćenja uređuju vaš pristup i korišćenje aplikacije
        <strong>{{ $t("appInfo.name") }}</strong
        >.
      </p>

      <h2>1. Prihvatanje uslova</h2>
      <p>
        Kreiranjem naloga ili korišćenjem aplikacije prihvatate ove Uslove
        korišćenja i našu Politiku privatnosti.
      </p>

      <h2>2. Uslovi za korišćenje</h2>
      <p>
        Morate imati najmanje 18 godina, ili minimalnu starost propisanu od
        strane lokalnog nadležnog organa, da biste koristili aplikaciju.
      </p>

      <h2>3. Nalozi i autentikacija</h2>
      <p>Odgovorni ste za svoj nalog i pristupne podatke.</p>
      <ul>
        <li><p>Čuvajte pristupne podatke bezbedno.</p></li>
        <li><p>Ne delite nalog sa neovlašćenim licima.</p></li>
        <li>
          <p>
            Odgovorni ste za aktivnosti izvršene preko vašeg naloga, osim ako su
            posledica naše greške.
          </p>
        </li>
      </ul>

      <h2>4. Korisnički sadržaj i vlasništvo</h2>
      <p>
        Zadržavate vlasništvo nad sadržajem koji kreirate u aplikaciji (na
        primer, zapisi, naslovi, poruke). Dajete nam prava neophodna za čuvanje,
        obradu i sinhronizaciju tog sadržaja radi pružanja usluge.
      </p>

      <h2>5. Dozvoljeno korišćenje</h2>
      <p>Saglasni ste da nećete:</p>
      <ul>
        <li>
          <p>koristiti aplikaciju za nezakonite ili štetne aktivnosti,</p>
        </li>
        <li>
          <p>pokušavati neovlašćen pristup nalozima, sistemima ili podacima,</p>
        </li>
        <li>
          <p>narušavati bezbednost, stabilnost ili dostupnost aplikacije,</p>
        </li>
        <li><p>unositi maliciozan kod ili štetan sadržaj.</p></li>
      </ul>

      <h2>6. Push obaveštenja</h2>
      <p>
        Push obaveštenja su opciona i zahtevaju dozvolu vašeg
        uređaja/pretraživača. U svakom trenutku možete ih isključiti u
        podešavanjima.
      </p>

      <h2>7. Offline režim i sinhronizacija</h2>
      <p>
        Aplikacija može čuvati podatke lokalno (na primer IndexedDB) i kasnije
        ih sinhronizovati kada ste online. Vi ste odgovorni da proverite
        sinhronizovan sadržaj i njegovu tačnost.
      </p>

      <h2>8. Dostupnost usluge</h2>
      <p>
        Težimo da usluga bude dostupna, ali ne garantujemo neprekidan rad.
        Održavanje, problemi sa mrežom, prekidi kod trećih strana ili tehnički
        kvarovi mogu uticati na dostupnost.
      </p>

      <h2>9. Izmene usluge i uslova</h2>
      <p>
        Možemo povremeno menjati aplikaciju i ove Uslove. Nastavkom korišćenja
        nakon izmena smatramo da ste prihvatili ažurirane Uslove.
      </p>

      <h2>10. Ograničenje ili ukidanje pristupa</h2>
      <p>
        Možemo ograničiti ili ukinuti pristup ako kršite ove Uslove, koristite
        aplikaciju protivzakonito ili stvarate bezbednosni rizik.
      </p>

      <h2>11. Odricanje od garancija</h2>
      <p>
        Aplikacija se pruža po principu „takva kakva jeste“ i „kako je
        dostupna“, u meri dozvoljenoj zakonom, bez bilo kakvih garancija.
      </p>

      <h2>12. Ograničenje odgovornosti</h2>
      <p>
        U najvećoj meri dozvoljenoj zakonom, ne odgovaramo za posrednu,
        incidentnu, posebnu, posledičnu ili kaznenu štetu nastalu korišćenjem
        aplikacije.
      </p>

      <h2>13. Merodavno pravo</h2>
      <p>
        Na ove Uslove primenjuje se pravo Republike Srbije, osim ako obavezna
        pravila zaštite potrošača u vašoj državi prebivališta propisuju
        drugačije.
      </p>

      <h2>14. Kontakt</h2>
      <p>
        Za pitanja u vezi sa ovim Uslovima, kontaktirajte:
        <a href="mailto:info@webdak.rs" class="hover:underline"
          ><strong>info@webdak.rs</strong></a
        >
      </p>
    </div>
  </main>
</template>
