import { createMutationKeys } from '@lukemorales/query-key-factory'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  getApproveContractData,
  getFees,
} from 'lib/utils/evm'

export const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amount,
    wallet,
    from,
    accountNumber,
  }: {
    assetId: AssetId | undefined
    spender: string | undefined
    amount: string | undefined
    wallet: HDWallet | null
    from: string | undefined
    accountNumber: number | undefined
  }) => ({
    // note how we don't add the wallet here because of its non-serializable nature
    mutationKey: ['approve', { assetId, spender, amount, from }],
    mutationFn: async (_: void) => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (!amount) throw new Error('amount is required')
      if (!from) throw new Error('from address is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) throw new Error('accountNumber is required')

      const { assetReference, chainId } = fromAssetId(assetId)
      const approvalCalldata = getApproveContractData({
        approvalAmountCryptoBaseUnit: amount,
        spender,
        to: assetReference,
        chainId,
      })

      const adapter = assertGetEvmChainAdapter(chainId)

      const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
        adapter,
        to: assetReference,
        value: '0',
        data: approvalCalldata,
        from,
        supportsEIP1559: supportsETH(wallet) && (await wallet.ethSupportsEIP1559()),
      })

      const buildCustomTxInput = {
        accountNumber,
        data: approvalCalldata,
        to: assetReference,
        value: '0',
        wallet,
        ...fees,
      }

      const txHash = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION,
      })

      return txHash
    },
  }),
})
