/*
  Contour — customer status vocabulary (M5)
  Shared by the Customers table, the customer detail drawer, and the
  attention list so the four statuses in customers.json map to exactly one
  label/tone each, everywhere they appear.
*/

export const CUSTOMER_STATUS = {
  trial: { label: "Trial", tone: "neutral" },
  active: { label: "Active", tone: "positive" },
  past_due: { label: "Past due", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "negative" },
};

export const CUSTOMER_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past Due" },
  { value: "cancelled", label: "Cancelled" },
];
