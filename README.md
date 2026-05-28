# Percel Monorepo

Percel is a two-sided logistics platform with:
- `apps/user`: Expo app for customers
- `apps/driver`: Expo app for drivers
- `apps/api`: Fastify backend API
- `packages/shared`: shared types/constants/utils
- `packages/ui`: shared React Native UI package
- `packages/config`: shared TypeScript, ESLint, and Prettier configuration

## Prerequisites

- Node.js 20+
- pnpm 9+
- Expo CLI

## Getting Started

1. Install dependencies:
   `pnpm install`
2. Copy env templates and fill values:
   - `apps/api/.env.example`
   - `apps/user/.env.example`
   - `apps/driver/.env.example`
3. Run all workspaces in dev mode:
   `pnpm dev`

## Workspace Commands

- `pnpm dev` runs all `dev` scripts through Turbo.
- `pnpm build` runs all `build` scripts through Turbo.
- `pnpm lint` runs all `lint` scripts through Turbo.
- `pnpm type-check` runs all `type-check` scripts through Turbo.
