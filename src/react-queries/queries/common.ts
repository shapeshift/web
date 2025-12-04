import { createQueryKeys } from '@lukemorales/query-key-factory'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, tronChainId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { GetAllowanceErr } from '../types'

import type { PartialFields } from '@/lib/types'
import { assertGetChainAdapter } from '@/lib/utils'
import type { GetFeesWithWalletEip1559SupportArgs } from '@/lib/utils/evm'
import { getErc20Allowance } from '@/lib/utils/evm'
import { getTrc20Allowance } from '@/lib/utils/tron/getAllowance'

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

      // Asserts and makes the query error (i.e isError) if this errors - *not* a monadic error
      const adapter = assertGetChainAdapter(chainId)

      // No approval needed for selling a fee asset
      if (assetId === adapter.getFeeAssetId()) {
        return Err(GetAllowanceErr.IsFeeAsset)
      }

      // Handle TRON chain
      if (chainId === tronChainId) {
        const allowanceOnChainCryptoBaseUnit = await getTrc20Allowance({
          address: assetReference,
          spender,
          from,
          chainId,
        })

        return Ok(allowanceOnChainCryptoBaseUnit)
      }

      // Handle EVM chains
      if (!evmChainIds.includes(chainId as EvmChainId)) {
        return Err(GetAllowanceErr.NotEVMChain)
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
  hdwalletNativeVaultsList: () => ({
    queryKey: ['hdwalletNativeVaultsList'],
    queryFn: async () => {
      const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)

      const storedWallets = await Vault.list().then(vaultIds =>
        Promise.all(
          vaultIds.map(async id => {
            const meta = await Vault.meta(id)
            const name = String(meta?.get('name') ?? id)
            return { id, name }
          }),
        ),
      )

      return storedWallets
    },
  }),
})
