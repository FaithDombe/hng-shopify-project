# Everyday Market

Everyday Market is a Vite storefront and an Expo mobile app. Both use the same Supabase project for Google sign-in and account carts.

## Run the website locally on Windows

1. Install Node.js LTS if it is not installed.
2. Double-click `start.ps1` from the repository root.
3. Open http://localhost:5173.
4. Keep the PowerShell window open while using the app. Press Ctrl+C there to stop it.

You can also run the website from the repository root with `npm ci` followed by `npm run dev`.

## Set up and run the mobile app

1. Apply `supabase/schema.sql` in Supabase Dashboard → SQL Editor. This creates the account cart table and enables its realtime updates.
2. In Supabase Authentication → URL Configuration, add `everydaymarket://auth/callback` to the allowed redirect URLs. Keep Google sign-in enabled for the existing website provider.
3. In a terminal, change to `mobile` and copy `.env.example` to `.env`. Set the same Supabase project URL and publishable key used by the website.
4. Run `npm install`, then `npx expo start`.
5. Open the QR code with Expo Go on a phone on the same network. For Google sign-in in Expo Go, add the redirect URI printed by Expo to Supabase's allowed redirect URLs as well. A development build uses the `everydaymarket://auth/callback` scheme from `mobile/app.json`.
6. Sign in with the same Google account used on the website. Cart changes are stored in `public.carts` and broadcast through Supabase Realtime.

The mobile app includes the shop catalog and shared cart. Checkout remains on the website.

## Deploy the website to Vercel

Import the repository in Vercel and leave **Root Directory** at the repository root. Vercel detects Vite automatically; use `npm run build` and `dist` if the build settings need to be entered manually.
