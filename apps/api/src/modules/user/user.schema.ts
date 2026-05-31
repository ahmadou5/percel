import { Type } from '@sinclair/typebox';

export const UpdateProfileBody = Type.Object({
  fullName: Type.Optional(Type.String({ minLength: 2 })),
  dateOfBirth: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  address: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kycMethod: Type.Optional(Type.Union([Type.Literal('NIN'), Type.Literal('BVN'), Type.Null()])),
});

export const PushTokenBody = Type.Object({
  token: Type.String({ minLength: 1 }),
});

export const VerifyNinBody = Type.Object({
  nin: Type.String({ minLength: 11, maxLength: 11 }),
});

export const VerifyBvnBody = Type.Object({
  bvn: Type.String({ minLength: 11, maxLength: 11 }),
});

export const NotificationQuery = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  unreadOnly: Type.Optional(Type.Boolean()),
});

export const NotificationIdParams = Type.Object({
  notificationId: Type.String({ minLength: 1 }),
});

export const ChangePasswordBody = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 8 }),
});
