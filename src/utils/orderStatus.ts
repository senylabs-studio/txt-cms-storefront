/** Bootstrap badge color per order status — shared by OrdersPage's list and OrderDetailPage's
 *  header badge so they can't drift out of sync with each other. */
export const ORDER_STATUS_VARIANT: Record<string, string> = {
  PendingPayment: 'warning',
  Paid: 'success',
  Shipped: 'info',
  Delivered: 'primary',
  Cancelled: 'danger',
  Returned: 'secondary',
};
