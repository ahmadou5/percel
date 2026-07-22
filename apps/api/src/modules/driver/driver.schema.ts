import { Type } from '@sinclair/typebox';

export const DriverReviewsQuery = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

export const UpdateVehicleBody = Type.Object({
  vehicleType: Type.Union([Type.Literal('BIKE'), Type.Literal('TRICYCLE'), Type.Literal('CAR'), Type.Literal('VAN'), Type.Literal('TRUCK')]),
  vehiclePlate: Type.String({ minLength: 2 }),
  vehicleModel: Type.String({ minLength: 2 }),
});
