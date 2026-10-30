// The aptos framework account holds apt, usable as a sender stand-in for rate estimation without a
// connected wallet (simulation needs the sender to cover the 1 octa transfer, gas is amount-independent)
export const APTOS_PLACEHOLDER_ADDRESS = '0x1'
