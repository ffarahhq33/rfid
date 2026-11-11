export const initialRolls = Array.from({ length: 18 }, (_, i) => ({
  id: `RF-PK-20261110-${String(i + 1).padStart(4, "0")}`,
  epc: `E200341201${String(i + 1).padStart(8, "0")}`,
  model: ["D27A", "D38L", "P15B", "D42N"][i % 4],
  lot: `LOT-261110-${(i % 3) + 1}`,
  length: [250, 180, 220, 200][i % 4],
  location:
    i < 9
      ? `PK-A0${(i % 3) + 1}`
      : i < 13
        ? "In transit"
        : `SDY-B0${(i % 3) + 1}`,
  status:
    i < 9
      ? "Available"
      : i < 13
        ? "In Transit"
        : i < 16
          ? "Received"
          : i === 16
            ? "Issued"
            : "Completed",
}));
export const pageInfo = [
  [
    "Dashboard",
    "Operations overview",
    "A clear view of every roll. From Port Klang to Sendayan.",
  ],
  [
    "Registration",
    "Roll registration",
    "Give every roll a permanent identity.",
  ],
  [
    "PK Storage",
    "PK Roll Storage Area",
    "Available material, exactly where you need it.",
  ],
  [
    "PK Dispatch",
    "PK dispatch",
    "Prepare and track material leaving Port Klang.",
  ],
  [
    "SDY Receiving",
    "SDY receiving",
    "Reconcile incoming rolls against their shipment.",
  ],
  [
    "SDY Storage",
    "SDY Roll Storage Area",
    "Keep production moving with the right material.",
  ],
  [
    "Tag Reset",
    "RFID tag reset",
    "Close the loop. Release eligible tags for reuse.",
  ],
  [
    "Reports",
    "Reports & history",
    "Follow the complete journey of every roll.",
  ],
  ["Settings", "Settings & users", "Manage your operational workspace."],
];
