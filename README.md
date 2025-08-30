# Uniswap Wallet – Portfolio Visualizer (Snack‑Friendly)

A portfolio visualizer for a crypto wallet’s tokens across Mainnet Eth, Base, Polygon, Optimism, and Arbitrum, and supports sending from a seed/private key import.

This entire app was built around the constraint of running on [Snack Web](https://snack.expo.dev/). I built and tested primarily in local Expo, but designed the architecture to work on Snack web where several libs are unavailable. The app intentionally sticks closely to the provided Figma design to demonstrate fidelity, with UX improvements.

_Note: This demo targets Snack Web functionality and has not been tested on iOS or Android. Mobile support will be expanded in future iterations for full compatibility._

_Note: All api keys were created new for the purpose of this demo only and are not used anywhere else._

## Features

- Multi‑chain portfolio: Native + ERC‑20 balances across Ethereum, Base, Polygon, Optimism, and Arbitrum.
- Watch vs Full mode: Address input shows a read‑only portfolio; seed/private key import enables sending assets.
- Send flow: Choose recipient → token → amount, with validation, "send all", and a progress card to show transaction status.
- Virtualized lists: `FlatList` with tuned windowing for very large wallets (spam tokens included).
- Rich metadata: Token images and USD prices when available, fallbacks when rate limited.
- UX states: Disabled buttons, loading spinners, inline notices, and filtered‑asset toggles.

## Project Structure

- `screens/`: Entry, Import Seed/Key, Watch Address, Portfolio, Send, Transactions.
- `components/`: Reusable UI (buttons, inputs, notices), list rows, icons, navigation stack.
- `store/`: Tiny global store and app state.
- `providers/`: Alchemy/CoinGecko/ethers helpers.
- `services/`: Wallet asset data.
- `lib/`: Utilities (formatting, rate‑limiting, helpers, chain config, etc).

## Architecture

- React Navigation (Stack): Snack doesn’t support `expo-router`, so I used `@react-navigation/*` and deep‑linking config for Snack web.
- Tamagui UI: Cross platform styling, theme tokens, and great devex. I customized the accent theme to match Uniswap.
- Global store: I wrote a tiny Zustand‑style store (`store/createStore.ts`, `store/appStore.ts`) using `useSyncExternalStore` selectors to avoid unnecessary re‑renders. It holds address, ephemeral signer, a portfolio cache, and network filter.
- Providers and services: Chain/RPC logic in `providers/*`, portfolio data in `services/portfolio.ts`, and view components in `components/*` and `screens/*`.

## Data Providers & Rationale

- Alchemy API: Chosen over Infura (free‑tier rate‑limits hit me) and because Alchemy’s Data API returns richer, normalized token data. Snack‑friendly.
- CoinGecko API: Adds token icons and prices. The free tier caps at 30 requests/minute, so I throttle requests and have a notice in the UI if rate limited (if taken to production this would be removed).
- Ethers: Readonly providers (Alchemy when available, falling back to public RPCs) and signing. I keep the imported wallet in memory only and never persist it.
- Explorer APIs: Etherscan endpoints for transactions.

## Key Decisions & Tradeoffs

- Snack compatibility first: `expo-router`, `zustand`, `wagmi`, `viem` all unavailable. The tiny store gives me the ergonomics I like from Zustand (no boilerplate, simple API, memoized selectors) without the dependency.
- Virtualization: Large wallets with lots of assets rendered in a `FlatList`.
- Metadata limits: CoinGecko’s free tier means I can't fetch all the token metadata for larger wallets.
- UI: I stayed close to the Figma to show I can reproduce designs while improving UX (inline notices, focus styles, safe input).

## Safety & Robustness

- Address validation: `ethers.isAddress` prevents invalid addresses.
- Amount sanitization: `components/AmountInputCard.tsx` limits decimals and normalizes input to a safe numeric string.
- Token metadata: `components/AssetListRow.tsx` sanitizes token names/symbols (like URLs/emoji) to prevent spam.
- Ephemeral signer: Seed/private key only in memory for the session.

## Notable UI Elements

- NetworkTabs: Compact filter with tiny chain badges and an “All” grid.
- TxProgressCard: Single component to reflect stages of an onchain tx: Preparing → Broadcasting → Confirming, then Success/Error, with hash, fee, timestamp, and “View on Explorer” link.
- AssetIcon: Chain badge overlay.

## Running Locally

1. Install deps

   ```bash
   npm install
   ```

2. Configure API keys

   - Quick (recommended for Snack parity): Edit `constants/env.ts` and paste values into the exported constants.

3. Start (web works best for this Snack‑oriented build)

   ```bash
   npm run web

   or

   npx expo start --web
   ```

## If I Had More Time

- Consolidated send screen: Combine recipient, token picker, and amount into a single screen flow with validation and summary.
- Token detail: Detailed screens with charts and recent transfers per token.
- Better error handling: Network errors and retry.
