import { createQueryKeys } from '@lukemorales/query-key-factory'
import { type AssetId } from '@shapeshiftoss/caip'
import type {
  InboundAddressResponse,
  ThornodePoolResponse,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/thorService'
import { Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import type { ThorchainMimir } from 'lib/utils/thorchain/lending/types'
import type { ThorchainBlock } from 'lib/utils/thorchain/types'

const thornodeUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

// Feature-agnostic, abstracts away THORNode endpoints
export const thornode = createQueryKeys('thornode', {
  poolData: (assetId: AssetId | undefined) => ({
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')

      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data } = await axios.get<ThornodePoolResponse>(
        `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return data
    },
  }),
  poolsData: () => ({
    queryKey: ['thornodePoolsData'],
    queryFn: async () => {
      const poolResponse = await thorService.get<ThornodePoolResponse[]>(
        `${thornodeUrl}/lcd/thorchain/pools`,
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
      queryFn: async () => {
        const { data } = await axios.get<ThorchainMimir>(`${thornodeUrl}/lcd/thorchain/mimir`)
        return data
      },
    }
  },
  block: () => {
    return {
      queryKey: ['thorchainBlockHeight'],
      queryFn: async () => {
        const { data } = await axios.get<ThorchainBlock>(`${thornodeUrl}/lcd/thorchain/block`)
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
              `${thornodeUrl}/lcd/thorchain/inbound_addresses`,
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
