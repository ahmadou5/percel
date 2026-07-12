import { Type } from '@sinclair/typebox';

export const PaymentProviderBody = Type.Object({
  provider: Type.Union([Type.Literal('MONNIFY'), Type.Literal('PAYSTACK'), Type.Literal('SQUAD')]),
});
