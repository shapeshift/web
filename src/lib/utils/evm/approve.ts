import { fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { getFees } from '@shapeshiftoss/utils/dist/evm'

import { assertGetEvmChainAdapter, buildAndBroadcast, getApproveContractData } from '.'
import type { ApproveInputWithWallet } from './types'

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
