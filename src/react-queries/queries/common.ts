import { createQueryKeys } from '@lukemorales/query-key-factory'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { assertGetChainAdapter } from 'lib/utils'
import { getErc20Allowance } from 'lib/utils/evm'

import { GetAllowanceErr } from '../types'

export const common = createQueryKeys('common', {
  allowanceCryptoBaseUnit: (
    assetId: AssetId | undefined,
    spender: string | undefined,
    from: string | undefined,
  ) => ({
    queryKey: ['allowanceCryptoBaseUnit', assetId, spender, from],
    queryFn: async (): Promise<Result<string, GetAllowanceErr>> => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (!from) throw new Error('from address is required')

      const { chainId, assetReference } = fromAssetId(assetId)

      if (!evmChainIds.includes(chainId as EvmChainId)) {
        return Err(GetAllowanceErr.NotEVMChain)
      }

      // Asserts and makes the query error (i.e isError) if this errors - *not* a monadic error
      const adapter = assertGetChainAdapter(chainId)

      // No approval needed for selling a fee asset
      if (assetId === adapter.getFeeAssetId()) {
        return Err(GetAllowanceErr.IsFeeAsset)
      }

      const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
        address: assetReference,
        spender,
        from,
        chainId,
      })

      return Ok(allowanceOnChainCryptoBaseUnit)
    },
  }),
})
