import { fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { getNativeErc20Address } from '@shapeshiftoss/utils'

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
  from,
  pubKey,
}: ApproveInputWithWallet) => {
  const { assetReference, chainId } = fromAssetId(assetId)
  const to = getNativeErc20Address(assetId) ?? assetReference

  const adapter = assertGetEvmChainAdapter(chainId)

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit: amountCryptoBaseUnit,
    spender,
  })

  const buildCustomTxInput = await createBuildCustomTxInput({
    accountNumber,
    from,
    adapter,
    data,
    to,
    value: '0',
    wallet,
    pubKey,
  })

  const txHash = await buildAndBroadcast({
    adapter,
    buildCustomTxInput,
    receiverAddress: CONTRACT_INTERACTION,
  })

  return txHash
}
