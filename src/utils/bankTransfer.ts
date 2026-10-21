import { formatDate } from './locale';

/** The last day to pay a bank-transfer order: paymentDueAt is the Madrid midnight that ends it. */
export const lastDayToPay = (paymentDueAt: string): string =>
  formatDate(new Date(new Date(paymentDueAt).getTime() - 1),
    { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' });
