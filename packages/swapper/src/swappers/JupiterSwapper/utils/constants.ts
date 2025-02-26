import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../../types'

export const jupiterSupportedChainIds: ChainId[] = [KnownChainIds.SolanaMainnet]

export const JUPITER_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: jupiterSupportedChainIds,
  buy: jupiterSupportedChainIds,
}

export const PDA_ACCOUNT_CREATION_COST = 2040000

export const SOLANA_RANDOM_ADDRESS = '2zHKF6tqam3tnNFPK2E9nBDkV7GMXnvdJautmzqQdn8A'

export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

// Jupiter use 40% as a compute unit margin while calculating them, some TX reverts without this, as we add some compute units
// for account creations and referral, for stability purposes we add 60% margin
export const COMPUTE_UNIT_MARGIN_MULTIPLIER = 1.6

export const SHAPESHIFT_JUPITER_REFERRAL_KEY = 'Ajgmo453yGmcHDPoJBrMUj3GFwLVL7HaaZGNLkB8vREG'

export const JUPITER_AFFILIATE_CONTRACT_ADDRESS = 'REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3'

export const JUPITER_REFERALL_FEE_PROJECT_ACCOUNT = '45ruCyfdRkWpRNGEqWzjCiXRHkZs8WXCLQ67Pnpye7Hp'
