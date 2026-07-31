import { Type } from '@sinclair/typebox';

export const AddressBody = Type.Object({
  street: Type.String(),
  city: Type.String(),
  state: Type.String(),
  country: Type.String(),
  lat: Type.Number(),
  lng: Type.Number(),
  placeId: Type.String(),
  formattedAddress: Type.String(),
});

export const OrderItemBody = Type.Object({
  description: Type.String({ minLength: 1 }),
  quantity: Type.Number({ minimum: 1 }),
  weightKg: Type.Number({ minimum: 0.1 }),
  fragile: Type.Optional(Type.Boolean()),
  imageUrl: Type.Optional(Type.String()),
});

export const QuoteBody = Type.Object({
  size: Type.Union([Type.Literal('SMALL'), Type.Literal('MEDIUM'), Type.Literal('LARGE')]),
  originHubId: Type.Optional(Type.String()),
  destinationHubId: Type.Optional(Type.String()),
  routeId: Type.Optional(Type.String()),
  localPickupAddress: Type.Optional(Type.String()),
  pickupAddress: Type.Optional(Type.String()),
  deliveryAddress: Type.Optional(Type.String()),
  pickupLat: Type.Optional(Type.Number()),
  pickupLng: Type.Optional(Type.Number()),
  deliveryLat: Type.Optional(Type.Number()),
  deliveryLng: Type.Optional(Type.Number()),
});

export const DirectionsBody = Type.Object({
  originLat: Type.Number(),
  originLng: Type.Number(),
  destLat: Type.Number(),
  destLng: Type.Number(),
});

export const CreateOrderBody = Type.Object({
  size: Type.Union([Type.Literal('SMALL'), Type.Literal('MEDIUM'), Type.Literal('LARGE')]),
  originHubId: Type.Optional(Type.String()),
  destinationHubId: Type.Optional(Type.String()),
  routeId: Type.Optional(Type.String()),
  localPickupAddress: Type.Optional(Type.String()),
  pickupAddress: Type.Optional(Type.String()),
  deliveryAddress: Type.Optional(Type.String()),
  contactName: Type.Optional(Type.String()),
  contactPhone: Type.Optional(Type.String()),
  pickupNote: Type.Optional(Type.String()),
  recipientName: Type.String({ minLength: 1 }),
  recipientPhone: Type.String({ minLength: 1 }),
  items: Type.Array(OrderItemBody, { minItems: 1 }),
  notes: Type.Optional(Type.String()),
  fragile: Type.Optional(Type.Boolean()),
});

export const OrderQuery = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  status: Type.Optional(
    Type.Union([
      Type.Literal('CREATED'),
      Type.Literal('PENDING_MATCH'),
      Type.Literal('MATCHED'),
      Type.Literal('ACCEPTED'),
      Type.Literal('IN_TRANSIT'),
      Type.Literal('DELIVERED'),
      Type.Literal('COMPLETED'),
      Type.Literal('CANCELLED'),
      Type.Literal('DISPUTED'),
    ]),
  ),
});

export const StatusBody = Type.Object({
  status: Type.Union([Type.Literal('IN_TRANSIT'), Type.Literal('DELIVERED')]),
  lat: Type.Optional(Type.Number()),
  lng: Type.Optional(Type.Number()),
});

export const CancelBody = Type.Object({
  reason: Type.String({ minLength: 1 }),
});

export const DisputeBody = Type.Object({
  reason: Type.String({ minLength: 1 }),
});


export const RateOrderBody = Type.Object({
  userRating: Type.Integer({ minimum: 1, maximum: 5 }),
  userComment: Type.Optional(Type.String({ minLength: 1 })),
});

export const DriverRateOrderBody = Type.Object({
  driverRating: Type.Integer({ minimum: 1, maximum: 5 }),
  driverComment: Type.Optional(Type.String({ minLength: 1 })),
});

export const CourierLocationBody = Type.Object({
  lat: Type.Number(),
  lng: Type.Number(),
  heading: Type.Optional(Type.Number()),
  speed: Type.Optional(Type.Number()),
});

