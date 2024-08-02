import { fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'

import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getApproveContractData,
} from '.'
import type { ApproveInputWithWallet } from './types'

export const approve = async ({
  assetId,
  spender,
  amountCryptoBaseUnit,
  wallet,
  accountNumber,
}: ApproveInputWithWallet) => {
  const { assetReference: to, chainId } = fromAssetId(assetId)

  const adapter = assertGetEvmChainAdapter(chainId)

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit: amountCryptoBaseUnit,
    spender,
    to,
    chainId,
  })

  const buildCustomTxInput = await createBuildCustomTxInput({
    accountNumber,
    adapter,
    data,
    to,
    value: '0',
    wallet,
  })

  const txHash = await buildAndBroadcast({
    adapter,
    buildCustomTxInput,
    receiverAddress: CONTRACT_INTERACTION,
  })

  return txHash
}
