import type {
  GetWalletNFTsResponseAdapter,
  GetWalletTokenBalancesResponseAdapter,
} from '@moralisweb3/common-evm-utils'
import { EvmChain } from '@moralisweb3/common-evm-utils'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAccountId,
  fromAssetId,
  gnosisChainId,
  isNft,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import Moralis from 'moralis'

import { getConfig } from '@/config'

const startMoralis = async () => {
  if (Moralis.Core.isStarted) return

  await Moralis.start({
    apiKey: getConfig().VITE_MORALIS_API_KEY,
  })
}

export const CHAIN_ID_TO_MORALIS_ERC20_CHAIN = {
  [ethChainId]: EvmChain.ETHEREUM,
  [polygonChainId]: EvmChain.POLYGON,
  [optimismChainId]: EvmChain.OPTIMISM,
  [arbitrumChainId]: EvmChain.ARBITRUM,
  [bscChainId]: EvmChain.BSC,
  [baseChainId]: EvmChain.BASE,
  [gnosisChainId]: EvmChain.GNOSIS,
  [avalancheChainId]: EvmChain.AVALANCHE,
}

export type MoralisErc20Account = ReturnType<GetWalletTokenBalancesResponseAdapter['toJSON']>

export type MoralisNftAccount = ReturnType<GetWalletNFTsResponseAdapter['toJSON']>

export const getMoralisErc20Account =
  (accountId: AccountId) => async (): Promise<MoralisErc20Account | null> => {
    try {
      const chain = CHAIN_ID_TO_MORALIS_ERC20_CHAIN[fromAccountId(accountId).chainId]
      if (!chain) return null

      await startMoralis()

      const balances = await Moralis.EvmApi.token.getWalletTokenBalances({
        address: fromAccountId(accountId).account,
        chain,
      })

      return balances.toJSON()
    } catch (error) {
      console.error('Error fetching Moralis ERC20 account data:', error)
      return null
    }
  }

export const getMoralisNftAccount =
  (accountId: AccountId) => async (): Promise<MoralisNftAccount | null> => {
    try {
      const chain = CHAIN_ID_TO_MORALIS_ERC20_CHAIN[fromAccountId(accountId).chainId]
      if (!chain) return null

      await startMoralis()

      const balances = await Moralis.EvmApi.nft.getWalletNFTs({
        address: fromAccountId(accountId).account,
        chain,
      })

      return balances.toJSON()
    } catch (error) {
      console.error('Error fetching Moralis account data:', error)
      return null
    }
  }

export const moralisReportSpam = async (assetId: AssetId) => {
  try {
    const chain = CHAIN_ID_TO_MORALIS_ERC20_CHAIN[fromAssetId(assetId).chainId]
    if (!chain) return

    await startMoralis()

    const assetReference = fromAssetId(assetId).assetReference
    const contractAddress = isNft(assetId) ? assetReference.split('/')[0] : assetReference

    if (!contractAddress) return

    await Moralis.EvmApi.utils.reviewContracts(
      { chain },
      {
        contracts: [
          {
            reason: 'Reported by ShapeShift user as spam holding',
            contractAddress,
            reportType: 'spam',
            contractType: isNft(assetId) ? 'NFT' : 'ERC20',
          },
        ],
      },
    )
  } catch (error) {
    console.error('Error reporting spam to Moralis', error)
    return null
  }
}
