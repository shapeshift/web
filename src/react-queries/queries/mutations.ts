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

type ApproveInput = {
  assetId: AssetId
  spender: string
  amountCryptoBaseUnit: string
  from: string
  accountNumber: number
}
export type MaybeApproveInput = Partial<ApproveInput>

type ApproveInputWithWallet = ApproveInput & { wallet: HDWallet }
type MaybeApproveInputWithWallet = Partial<ApproveInputWithWallet>

export const approve = async ({
  assetId,
  spender,
  amountCryptoBaseUnit,
  wallet,
  from,
  accountNumber,
}: ApproveInputWithWallet) => {
  const { assetReference, chainId } = fromAssetId(assetId)
  const approvalCalldata = getApproveContractData({
    approvalAmountCryptoBaseUnit: amountCryptoBaseUnit,
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
}

export const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amountCryptoBaseUnit,
    from,
    accountNumber,
    wallet,
  }: MaybeApproveInputWithWallet) => ({
    mutationKey: ['approve', { accountNumber, assetId, spender, amountCryptoBaseUnit, from }],
    mutationFn: (_: void) => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (amountCryptoBaseUnit === undefined) throw new Error('non-undefined amount is required')
      if (!from) throw new Error('from address is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) throw new Error('accountNumber is required')

      return approve({ assetId, spender, amountCryptoBaseUnit, from, accountNumber, wallet })
    },
  }),
})
