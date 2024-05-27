import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, Asset, MarketData } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { assertGetChainAdapter } from 'lib/utils'
import { assertGetEvmChainAdapter, getErc20Allowance, getFeesWithWallet } from 'lib/utils/evm'
import { getThorchainFromAddress } from 'lib/utils/thorchain'
import type { getThorchainLendingPosition } from 'lib/utils/thorchain/lending'
import type { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { getThorchainSaversPosition } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'

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
  thorchainFromAddress: ({
    accountId,
    assetId,
    opportunityId,
    wallet,
    accountMetadata,
    getPosition,
  }: {
    accountId: AccountId
    assetId: AssetId
    opportunityId?: string | undefined
    wallet: HDWallet
    accountMetadata: AccountMetadata
    getPosition:
      | typeof getThorchainLendingPosition
      | typeof getThorchainSaversPosition
      | typeof getThorchainLpPosition
  }) => ({
    queryKey: ['thorchainFromAddress', accountId, assetId, opportunityId],
    queryFn: async () =>
      await getThorchainFromAddress({
        accountId,
        assetId,
        opportunityId,
        getPosition,
        accountMetadata,
        wallet,
      }),
  }),
  evmFees: ({
    data,
    wallet,
    accountNumber,
    to,
    from,
    value,
    feeAsset,
    feeAssetMarketData,
  }: {
    to: string
    // Only used to make the queryKey unique by from address, since wallet doesn't serialize and is excluded from the queryKey
    from: string
    accountNumber: number
    wallet: HDWallet
    data: string
    value: string
    feeAsset: Asset
    feeAssetMarketData: MarketData
  }) => ({
    queryKey: ['evmFees', to, from, accountNumber, data, value],
    queryFn: async () => {
      const adapter = assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId)

      const fees = await getFeesWithWallet({
        adapter,
        data,
        wallet,
        to,
        value,
        accountNumber,
      })

      const txFeeFiat = bn(fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision))
        .times(feeAssetMarketData.price)
        .toString()

      const { networkFeeCryptoBaseUnit } = fees
      return { fees, txFeeFiat, networkFeeCryptoBaseUnit }
    },
  }),
})
