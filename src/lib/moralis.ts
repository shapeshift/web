import { EvmChain } from '@moralisweb3/common-evm-utils'
import type { AssetId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
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

export const moralisReportSpam = async (assetId: AssetId) => {
  try {
    const chain = CHAIN_ID_TO_MORALIS_CHAIN[fromAssetId(assetId).chainId]
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
    return
  }
}
