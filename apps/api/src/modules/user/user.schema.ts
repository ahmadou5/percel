import { Type } from '@sinclair/typebox';

export const UpdateProfileBody = Type.Object({
  fullName: Type.Optional(Type.String({ minLength: 2 })),
  dateOfBirth: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  address: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const PushTokenBody = Type.Object({
  token: Type.String({ minLength: 1 }),
});

export const ChangePasswordBody = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 8 }),
});
