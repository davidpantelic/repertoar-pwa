# vue-pwa-template

A modern, production-ready Vue3 PWA template for building Progressive Web Applications.

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Supabase Migration Runbook](#supabase-migration-runbook)
- [Production Checklist](#production-checklist)
- [Building for Production](#building-for-production)
- [License](#license)
- [Trademark Notice](#trademark-notice)

## Description

This is a Progressive Web App (PWA) built with Vue 3, TypeScript, and Vite. The application includes offline support, push notifications, and installability across all modern browsers.

## Features

- **Progressive Web App (PWA)** - Installable on desktop and mobile devices
- **API-ready** - Loader, error handling, offline queue
- **Offline Support** - Full functionality when internet connection is unavailable
- **Auth Flows** - Email/password, Google OAuth, email confirmation, password reset
- **Session Controls** - Logout local session and logout other devices
- **Push Notifications** - Real-time notifications on supported devices
- **Screen Wake Lock** - Toggle on/off screen wake lock
- **Theme Support** - Light / Dark
- **Internationalization** - Multi language, localization features, etc
- **Legal Pages** - Built-in Privacy Policy and Terms of Use pages (EN/SR)
- **Responsive Design** - Works seamlessly on all screen sizes
- **Type-Safe** - Built with TypeScript for better code quality
- **Fast & Optimized** - Vite ensures quick build times and optimal performance
- **Service Worker** - Background synchronization and caching strategies

## Tech Stack

- **Frontend Framework:** Vue 3
- **Backend:** Supabase
- **Language:** JavaScript/TypeScript
- **Build Tool:** Vite
- **UI Components:** PrimeVue
- **Styling:** Tailwind, CSS/SCSS, PrimeVue presets
- **Package Manager:** npm / pnpm
- **Internationalization** - i18n
- **PWA Support:** Service Workers, Web App Manifest
- **State Management:** Pinia
- **Testing:** Vitest

## Requirements

- **Node.js:** v16.0.0 or higher
- **npm:** v7.0.0 or higher (or `pnpm` v6.0.0+)
- **Modern Browser:** Chrome, Firefox, Safari, Edge with ES2020+ support
- **For best experience:** Google Chrome (for PWA installation)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/davidpantelic/vue-pwa-template.git
   cd vue-pwa-template
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   The app will be available at `http://localhost:5173`

## Usage

### Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm run test
```

### Lint Code

```bash
npm run lint
```

## Configuration

### Environment Variables

Create `.env.development` (or `.env`) and set:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

### PWA Installation

To install the app:

- **Desktop (Chrome/Edge):** Click the install button in the app or in the address bar
- **Android (Chrome):** Click the install button in the app OR Menu/Settings → Install app
- **iOS (Safari):** Share → Add to Home Screen

### Push Notifications

Users can enable notifications by clicking the notification icon. The app will request permission and display notifications on supported devices.

For the `send-push` Supabase Edge Function, configure function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `VAPID_KEYS_JSON`
- `VAPID_SUBJECT` (or `VAPID_URL`)

### Offline Mode

The app automatically caches essential resources. When offline, a network indicator appears in the UI. Data syncs automatically when connection is restored.

### Supabase Auth Setup

- Enable desired auth providers (Email/Password, Google).
- For Google OAuth, add callback URI in Google Cloud:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Add redirect URLs in Supabase Auth URL allow list (for local + production), for example:
  - `/auth-confirmation`
  - `/email-changed`
  - `/google-auth-confirmation`
  - `/password-reset`

### Legal Pages

- Privacy Policy: `/privacy`
- Terms of Use: `/terms`

## Supabase Migration Runbook

Use this when provisioning a new Supabase project from this template.

### 1. Link CLI to target project

```bash
supabase link --project-ref <your_project_ref>
```

### 2. Apply all migrations

```bash
supabase db push
```

### 3. Deploy edge functions

```bash
supabase functions deploy send-push
```

### 4. Set edge function secrets

```bash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set APP_URL=...
supabase secrets set VAPID_KEYS_JSON=...
supabase secrets set VAPID_SUBJECT=...
```

### 5. Configure Supabase Auth dashboard

- Providers: enable Email/Password and Google (if used)
- URL allow list: add all app redirect URLs (local + production)
- SMTP and email templates: configure as needed

## Production Checklist

- Set frontend env vars in your hosting platform:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_VAPID_PUBLIC_KEY`
- Configure Supabase Auth URL allow list for all used redirect paths (local + production).
- For Google OAuth:
  - set Google callback URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`
  - configure Google Client ID/Secret in Supabase provider settings
- Enable and verify RLS policies on app tables.
- Ensure required tables exist and are configured:
  - `songs`
  - `playlists`
  - `playlist_songs`
  - `subscription_plan`
  - `profiles`
  - `user_note_keys`
  - `push_subscriptions`
  - `auth_events` (if using logout-other-devices realtime signal)
- Configure Edge Function secrets for `send-push`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_URL`
  - `VAPID_KEYS_JSON`
  - `VAPID_SUBJECT` (or `VAPID_URL`)
- Verify service worker/PWA behavior on HTTPS production domain.
- Verify Privacy Policy and Terms pages are reachable and linked in UI.

## Building for Production

```bash
# Build the application
npm run build

# Preview the production build locally
npm run preview

# Deploy to your hosting service
```

The `dist/` folder contains the production-ready files ready for deployment.

## License

MIT © Webdak

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## Trademark Notice

The name **Webdak**, the Webdak logo, and related branding
are trademarks of Webdak.

This license does not grant permission to use the
trade names, trademarks, service marks, or logos of Webdak,
except as required for reasonable and customary use
in describing the origin of the software.

---

**Built by Webdak/David Pantelic**

For questions and support, please contact me at [davidpantelic1996@gmail.com](mailto:davidpantelic1996@gmail.com)
