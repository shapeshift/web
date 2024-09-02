import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { AccountMetadata, EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { PartialFields } from 'lib/types'
import { assertGetChainAdapter } from 'lib/utils'
import type { GetFeesWithWalletEip1559SupportArgs } from 'lib/utils/evm'
import { getErc20Allowance } from 'lib/utils/evm'
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

      // 0x0 is used as a placeholder for the special case of token swaps that do not require an approval, as the network automagically handles the transfer at chain-level
      // e.g Arbitrum Bridge token withdraws, or Gnosis bridge swaps out of Gnosis chains are examples of chains with such magic
      if (spender === '0x0') {
        return Err(GetAllowanceErr.ZeroAddress)
      }
      if (!evm.evmChainIds.includes(chainId as EvmChainId)) {
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
    to,
    value,
    chainId,
    from,
  }: PartialFields<
    Omit<GetFeesWithWalletEip1559SupportArgs, 'wallet' | 'adapter'>,
    'data' | 'to' | 'from'
  > & {
    chainId: ChainId | undefined
  }) => ({
    queryKey: ['evmFees', to, chainId, data, value, from],
  }),
})
