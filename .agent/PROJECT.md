# Parcel Project Context

## Snapshot
- **Name:** Parcel
- **Purpose:** Nigerian mobile super-app for NGN wallet, bill payments, and interstate waybill delivery.
- **Monorepo:** `pnpm` workspaces + Turborepo with `apps/{api,admin,driver,user}` and shared packages.

## Stack
- **Root:** `pnpm@8.15.3`, `turbo`, ESLint, TypeScript.
- **User app:** Expo `~54`, React Native `0.81.5`, React `19.1.0`, Expo Router `~6.0.24`, React Navigation `^7.1.8`, Hermes.
- **State/data:** Zustand, TanStack Query `^5`, Axios, SecureStore, AsyncStorage.
- **Native/UX:** Reanimated 4, Gesture Handler, Safe Area, Screens, FlashList, Bottom Sheet, Image Picker, Screen Capture, Local Auth, Notifications, Web Browser, Clipboard.
- **Brand/UI:** `lucide-react-native`, `@expo-google-fonts/space-grotesk`, `nativewind` + `tailwindcss`, Sentry.
- **TypeScript:** strict mode, `@/*` path alias.
- **Expo app config (`apps/user/app.json`):** automatic theme, new architecture enabled, typed routes, `expo-router`, `expo-notifications`, scheme `percel`, package/bundle IDs for `com.percel.user`.

## Theme System
- Primary tokens live in `apps/user/constants/palette.ts` (`bg/card/text/primary/success/error/warning/border`).
- Legacy `apps/user/constants/Colors.ts` still powers some screens/components via `components/Themed.tsx`.
- `useColorScheme()` drives runtime light/dark selection; Expo config uses `userInterfaceStyle: "automatic"`.
- `apps/user/app/_layout.tsx` wraps the app in `@react-navigation/native` `ThemeProvider` (`DefaultTheme`/`DarkTheme`).
- `apps/user/components/navigation/FloatingTabBar.tsx` has its own light/dark `NAV_THEME` but keys off `palette`/`useColorScheme()`.

## Navigation
- `apps/user/app/_layout.tsx` hydrates auth, loads fonts, mounts `QueryClientProvider`, then a root `Stack` with `(auth)` and `(tabs)`.
- `apps/user/app/(auth)/_layout.tsx` blocks authenticated users from auth screens.
- `apps/user/app/(tabs)/_layout.tsx` blocks unauthenticated users and app-locked sessions, then mounts a custom `FloatingTabBar`.
- Tabs are `Home`, `Create`, `Orders`, `Settings`; `notifications` and `wallet` are hidden routes.
- Nested stacks exist under `send`, `orders`, `profile`, and `wallet`; `wallet` is currently a hidden redirect back to home.
- `FloatingTabBar` only renders on the home path and hides on routes like wallet subpages, notifications, auth-lock, referrals, and settings.

## Screen Inventory
| Path | Description |
|---|---|
| `apps/user/app/_layout.tsx` | Root shell: fonts, Sentry, auth hydration, React Query, theme provider, root stack. |
| `apps/user/app/(auth)/_layout.tsx` | Auth stack gate; redirects signed-in users to home. |
| `apps/user/app/(auth)/welcome.tsx` | Landing screen with brand intro and entry CTAs for login/register. |
| `apps/user/app/(auth)/login.tsx` | Phone/password login form with biometric prompt affordance. |
| `apps/user/app/(auth)/register.tsx` | Two-step registration form with profile details and password setup. |
| `apps/user/app/(auth)/forgot-password.tsx` | Password reset request form for email or phone. |
| `apps/user/app/auth-lock.tsx` | Full-screen app lock with PIN pad and biometric unlock. |
| `apps/user/app/(tabs)/_layout.tsx` | Consumer tab navigator with auth/app-lock guarding and custom floating bar. |
| `apps/user/app/(tabs)/index.tsx` | Home dashboard: balance hero, actions, transactions, and PIN prompt modal. |
| `apps/user/app/(tabs)/notifications.tsx` | Notifications inbox with unread filter and mark-read actions. |
| `apps/user/app/(tabs)/send/_layout.tsx` | Stack shell for the shipment create flow. |
| `apps/user/app/(tabs)/send/index.tsx` | Shipment entry screen for pickup/delivery address input. |
| `apps/user/app/(tabs)/send/package.tsx` | Package details step with size, fragile toggle, items, and notes. |
| `apps/user/app/(tabs)/send/quote.tsx` | Quote review and payment confirmation for a shipment. |
| `apps/user/app/(tabs)/send/tracking/[id].tsx` | Live shipment tracking screen with status updates and confirmation. |
| `apps/user/app/(tabs)/orders/_layout.tsx` | Stack shell for order list/detail/rating routes. |
| `apps/user/app/(tabs)/orders/index.tsx` | Orders list with active/past tabs and order cards. |
| `apps/user/app/(tabs)/orders/[id].tsx` | Order detail with route, driver, items, and status timeline. |
| `apps/user/app/(tabs)/orders/rate/[id].tsx` | Delivery rating screen with stars and comment input. |
| `apps/user/app/(tabs)/profile/_layout.tsx` | Stack shell for profile-related routes. |
| `apps/user/app/(tabs)/profile/index.tsx` | Account/profile overview with avatar, KYC state, referral, and settings entry. |
| `apps/user/app/(tabs)/profile/edit.tsx` | Profile edit form, avatar upload, password change, and delete account flow. |
| `apps/user/app/(tabs)/profile/security.tsx` | Transfer PIN and app-lock settings screen. |
| `apps/user/app/(tabs)/wallet/_layout.tsx` | Stack shell for wallet and bill-pay routes. |
| `apps/user/app/(tabs)/wallet/index.tsx` | Redirects home; legacy wallet tab placeholder. |
| `apps/user/app/(tabs)/wallet/topup.tsx` | Deposit/top-up flow using NUBAN details and Paystack checkout. |
| `apps/user/app/(tabs)/wallet/transfer.tsx` | Wallet transfer flow for bank and inter-app transfers. |
| `apps/user/app/(tabs)/wallet/airtime.tsx` | Airtime purchase flow with live provider detection. |
| `apps/user/app/(tabs)/wallet/data.tsx` | Data bundle purchase flow with provider variations. |
| `apps/user/app/(tabs)/wallet/tv.tsx` | TV subscription renewal flow with provider validation. |
| `apps/user/app/(tabs)/wallet/electricity.tsx` | Electricity bill payment flow with meter validation. |
| `apps/user/app/(tabs)/wallet/transactions.tsx` | Searchable transaction ledger with filters and detail modal. |
| `apps/user/app/(tabs)/wallet/bills.tsx` | Redirect stub to the TV subscription flow. |
| `apps/user/app/settings/index.tsx` | Settings hub with grouped account/activity/security menus and logout sheet. |
| `apps/user/app/settings/[slug].tsx` | Generic settings detail route for KYC, limits, beneficiaries, support, etc. |
| `apps/user/app/settings/kyc.tsx` | KYC form for address, DOB, and BVN/NIN verification. |
| `apps/user/app/referrals.tsx` | Refer-and-earn page with code sharing. |
| `apps/user/app/modal.tsx` | Sample modal demo screen. |

## Conventions
- Absolute imports via `@/…`.
- One feature folder per route group; nested Expo Router stacks handle subflows.
- Theme styling usually follows `palette + Spacing + Typography + StyleSheet`.
- Animation patterns: Reanimated `FadeIn*` on auth screens, `Animated.spring` for tab/lock interactions, `withRepeat` backdrop motion.
- Data access is mostly hook-based (`useWallet`, `useOrder`, `useProfile`, `useNotifications`) with React Query.
- Shared UI lives in `components/ui`, domain UI in `components/wallet` and `components/order`.
- `Pressable` styles commonly use inline pressed states instead of bespoke gesture code.
- Lists use `FlashList` where volume is high (`transactions`).

## .agent Files
- `features/navbar-redesign.md`
- `features/home-wallet-merge.md`
- `features/shipment-create-flow.md`
- `features/auth-lock-screen.md`
- `features/settings-profile-split.md`
- `fixes/`: none

