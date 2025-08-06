import { EvmChain } from '@moralisweb3/common-evm-utils'
import type { AccountId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { memoize } from 'lodash'
import Moralis from 'moralis'

import { getConfig } from '@/config'

const startMoralis = memoize(async () => {
  await Moralis.start({
    apiKey: getConfig().VITE_MORALIS_API_KEY,
  })
})

export const CHAIN_ID_TO_MORALIS_CHAIN = {
  [ethChainId]: EvmChain.ETHEREUM,
  [polygonChainId]: EvmChain.POLYGON,
  [optimismChainId]: EvmChain.OPTIMISM,
  [arbitrumChainId]: EvmChain.ARBITRUM,
  [bscChainId]: EvmChain.BSC,
  [baseChainId]: EvmChain.BASE,
  [gnosisChainId]: EvmChain.GNOSIS,
  [avalancheChainId]: EvmChain.AVALANCHE,
}

export type MoralisAccount = {
  token_address: string
  name: string
  symbol: string
  logo?: string | undefined
  thumbnail?: string | undefined
  decimals: number
  balance: string
  possible_spam: boolean
  verified_contract?: boolean | undefined
}[]

export const getMoralisAccountQueryFn =
  (accountId: AccountId) => async (): Promise<MoralisAccount | undefined> => {
    try {
      await startMoralis()

      const balances = await Moralis.EvmApi.token.getWalletTokenBalances({
        address: fromAccountId(accountId).account,
        chain: CHAIN_ID_TO_MORALIS_CHAIN[fromAccountId(accountId).chainId],
      })

      return balances.toJSON()
    } catch (error) {
      console.error('Error fetching Moralis account data:', error)
      return undefined
    }
  }
