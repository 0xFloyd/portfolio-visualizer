2. Start the app

   ```bash
npx expo start
```

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Environment Variables

- Source: `app.config.ts` loads `.env`/`.env.local` and exposes values via `expo-constants` `extra`.
- Add a local `.env` (not committed) by copying `.env.example` and filling keys:

```
INFURA_API_KEY=...
ALCHEMY_API_KEY=...
ETHERSCAN_API_KEY=...
COINGECKO_API_KEY=...
```

- In code, values are read centrally from `@/constants/env`.
- When running `npm run web:reload`, the script loads `.env` and exports keys as `EXPO_PUBLIC_*` for Expo web.
- After changing `.env`, stop and restart `npm run web:reload` to apply changes (config/env is read at server start).
- When exporting to Snack, hardcode demo keys in place (Snack does not load `.env`).
