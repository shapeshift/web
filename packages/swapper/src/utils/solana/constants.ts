import { DAO_TREASURY_SOLANA } from '@shapeshiftoss/utils'

// The DAO treasury is a rent-exempt system account we control, usable as a payer stand-in for
// rate estimation without a connected wallet (simulation requires the payer to exist and cover
// the transfer, so estimation transfers 1 lamport - compute consumption is amount-independent)
export const SOLANA_PLACEHOLDER_ADDRESS = DAO_TREASURY_SOLANA
