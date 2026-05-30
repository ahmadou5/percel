import { Type } from '@sinclair/typebox';

export const TopUpBody = Type.Object({
  amount: Type.Number({ minimum: 100, maximum: 1000000 }),
  callbackUrl: Type.Optional(Type.String()),
});

export const TransferBody = Type.Object({
  toPhone: Type.String(),
  amount: Type.Number({ minimum: 1 }),
  description: Type.Optional(Type.String()),
  pin: Type.String({ minLength: 4, maxLength: 6 }),
});

export const SetTransferPinBody = Type.Object({
  currentPin: Type.Optional(Type.String({ minLength: 4, maxLength: 6 })),
  newPin: Type.String({ minLength: 4, maxLength: 6 }),
});

export const ResetTransferPinBody = Type.Object({
  currentPin: Type.String({ minLength: 4, maxLength: 6 }),
});

export const VerifyTransferPinBody = Type.Object({
  pin: Type.String({ minLength: 4, maxLength: 6 }),
});

export const AirtimeBody = Type.Object({
  phone: Type.String(),
  amount: Type.Number({ minimum: 1 }),
  network: Type.String(),
});

export const DataBody = Type.Object({
  phone: Type.String(),
  plan: Type.String(),
  network: Type.String(),
  amount: Type.Number({ minimum: 1 }),
});

export const ElectricityBody = Type.Object({
  meterNumber: Type.String(),
  amount: Type.Number({ minimum: 1 }),
  disco: Type.String(),
});

export const TxQuery = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  category: Type.Optional(Type.String()),
});
