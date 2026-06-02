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

export const TransferRecipientResolveBody = Type.Object({
  phone: Type.String(),
});

export const AirtimeResolveBody = Type.Object({
  phone: Type.String(),
});

export const BankResolveBody = Type.Object({
  bankCode: Type.String({ minLength: 3 }),
  accountNumber: Type.String({ minLength: 8, maxLength: 12 }),
});

export const BankTransferBody = Type.Object({
  bankCode: Type.String({ minLength: 3 }),
  accountNumber: Type.String({ minLength: 8, maxLength: 12 }),
  amount: Type.Number({ minimum: 1 }),
  description: Type.Optional(Type.String()),
  pin: Type.String({ minLength: 4, maxLength: 6 }),
});

export const ProviderServicesQuery = Type.Object({
  identifier: Type.Union([
    Type.Literal('airtime'),
    Type.Literal('data'),
    Type.Literal('tv-subscription'),
    Type.Literal('electricity-bill'),
  ]),
});

export const ProviderVariationsParams = Type.Object({
  serviceID: Type.String({ minLength: 2 }),
});

export const ProviderValidateBody = Type.Object({
  serviceID: Type.String({ minLength: 2 }),
  billersCode: Type.String({ minLength: 3 }),
  type: Type.Optional(Type.Union([Type.Literal('prepaid'), Type.Literal('postpaid')])),
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
  type: Type.Optional(Type.Union([Type.Literal('prepaid'), Type.Literal('postpaid')])),
});

export const TvBody = Type.Object({
  smartcardNumber: Type.String({ minLength: 6 }),
  amount: Type.Number({ minimum: 1 }),
  provider: Type.String({ minLength: 2 }),
  variationCode: Type.String({ minLength: 1 }),
  phone: Type.Optional(Type.String()),
});

export const TxQuery = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  category: Type.Optional(Type.String()),
});
