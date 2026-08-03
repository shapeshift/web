// Placeholder sender for rate estimation without a connected wallet - the balance override funds
// it as needed, and it never collides with a provider deposit address, keeping the estimated
// transfer two-slot shaped (a self-transfer touches one balance slot and estimates low)
export const EVM_PLACEHOLDER_ADDRESS = '0x000000000000000000000000000000000000dEaD'
