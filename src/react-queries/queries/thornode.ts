import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AssetId } from '@shapeshiftoss/caip'
import type { InboundAddressResponse, ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { assetIdToPoolAssetId, thorService } from '@shapeshiftoss/swapper'
import { Ok } from '@sniptt/monads'
import axios from 'axios'

import { getConfig } from '@/config'
import type { ThorchainBlock, ThorchainMimir } from '@/lib/utils/thorchain/types'

const thornodeUrl = getConfig().VITE_THORCHAIN_NODE_URL

export const fetchThorchainMimir = async () => {
  const { data } = await axios.get<ThorchainMimir>(`${thornodeUrl}/thorchain/mimir`)
  return data
}

// Feature-agnostic, abstracts away THORNode endpoints
export const thornode = createQueryKeys('thornode', {
  poolData: (assetId: AssetId | undefined) => ({
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')

      const poolAssetId = assetIdToPoolAssetId({ assetId })
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
  mimir: () => {
    return {
      queryKey: ['thorchainMimir'],
      queryFn: fetchThorchainMimir,
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
  inboundAddresses: () => {
    return {
      queryKey: ['thorchainInboundAddress'],
      queryFn: async () => {
        return (
          // Get all inbound addresses
          (
            await thorService.get<InboundAddressResponse[]>(
              `${thornodeUrl}/thorchain/inbound_addresses`,
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
