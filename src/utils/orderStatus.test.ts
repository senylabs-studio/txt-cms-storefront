import { describe, it, expect } from 'vitest';
import { orderStatusKey } from './orderStatus';

describe('orderStatusKey', () => {
  it('reads «Enviado» as «Listo para recoger» for a store pickup', () => {
    expect(orderStatusKey('Shipped', true)).toBe('orders.statuses.ReadyForPickup');
  });

  it('keeps the plain status otherwise', () => {
    expect(orderStatusKey('Shipped')).toBe('orders.statuses.Shipped');
    expect(orderStatusKey('Delivered', true)).toBe('orders.statuses.Delivered');
  });
});
