import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { mayachainChainId, thorchainChainId } from '@shapeshiftoss/caip'
import type { InboundAddressResponse, ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { assetIdToThorPoolAssetId, thorService } from '@shapeshiftoss/swapper'
import { Ok } from '@sniptt/monads'
import axios from 'axios'

import { getConfig } from '@/config'
import type { ThorchainBlock, ThorchainMimir } from '@/lib/utils/thorchain/types'

const thornodeUrl = getConfig().VITE_THORCHAIN_NODE_URL

const getNodeUrl = (chainId: ChainId) => {
  switch (chainId) {
    case thorchainChainId:
      return `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain`
    case mayachainChainId:
      return `${getConfig().VITE_MAYACHAIN_NODE_URL}/mayachain`
    default:
      throw new Error(`Invalid chain: ${chainId}`)
  }
}

// Feature-agnostic, abstracts away THORNode endpoints
export const thornode = createQueryKeys('thornode', {
  poolData: (assetId: AssetId | undefined) => ({
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')

      const poolAssetId = assetIdToThorPoolAssetId({ assetId })
      const { data } = await axios.get<ThornodePoolResponse>(
        `${thornodeUrl}/thorchain/pool/${poolAssetId}`,
      )

      return data
    },
  }),
  poolsData: () => ({
    queryKey: ['thornodePoolsData'],
    queryFn: async () => {
      const poolResponse = await thorService.get<ThornodePoolResponse[]>(
        `${thornodeUrl}/thorchain/pools`,
      )

      if (poolResponse.isOk()) {
        return poolResponse.unwrap().data
      }

      return []
    },
  }),
  mimir: (chainId: ChainId) => {
    return {
      queryKey: ['thorchainMimir'],
      queryFn: async () => {
        const { data } = await axios.get<ThorchainMimir>(`${getNodeUrl(chainId)}/mimir`)
        return data
      },
    }
  },
  block: () => {
    return {
      queryKey: ['thorchainBlockHeight'],
      queryFn: async () => {
        const { data } = await axios.get<ThorchainBlock>(`${thornodeUrl}/thorchain/block`)
        return data
      },
    }
  },
  inboundAddresses: (chainId: ChainId) => {
    return {
      queryKey: ['thorchainInboundAddress'],
      queryFn: async () => {
        return (
          // Get all inbound addresses
          (
            await thorService.get<InboundAddressResponse[]>(
              `${getNodeUrl(chainId)}/inbound_addresses`,
            )
          ).andThen(({ data: inboundAddresses }) => {
            // Exclude halted
            const activeInboundAddresses = inboundAddresses.filter(a => !a.halted)
            return Ok(activeInboundAddresses)
          })
        )
      },
    }
  },
})
