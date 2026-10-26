export const DONE_FOR_YOU = {
  title: "Done-for-you setup",
  lede: "We handle number setup, 10DLC registration, calendar connection, and the CRM connection.",
  points: [
    "Number setup means the shop's sending number and the no-answer forward.",
    "10DLC registration uses this shop's own details. We review the packet before anyone files it. Carrier approval still takes days to weeks.",
    "Calendar connection uses Google Calendar free/busy after the shop connects that account. Without it, openings stay labeled sandbox.",
    "CRM connection is HubSpot or Zoho, on every plan. That sync is coming soon and stays in sandbox until it is turned on.",
  ],
} as const;
