/*
  Contour — transaction status vocabulary (M5)
  Shared by the Transactions table and the customer detail drawer's
  transaction history list.
*/

export const TRANSACTION_STATUS = {
  paid: { label: "Paid", tone: "positive" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "negative" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const TRANSACTION_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];
