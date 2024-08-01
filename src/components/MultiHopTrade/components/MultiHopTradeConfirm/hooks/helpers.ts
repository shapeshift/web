import { fromAssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { type AllowanceType, getApprovalAmountCryptoBaseUnit } from 'hooks/queries/useApprovalFees'
import { assertGetEvmChainAdapter, getApproveContractData, getFeesWithWallet } from 'lib/utils/evm'
import { approve } from 'lib/utils/evm/approve'

export const getApprovalNetworkFeeCryptoBaseUnit = async ({
  tradeQuoteStep,
  wallet,
  allowanceType,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  wallet: HDWallet
  allowanceType: AllowanceType
}): Promise<string> => {
  const adapter = assertGetEvmChainAdapter(tradeQuoteStep.sellAsset.chainId)
  const { assetReference: to } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
      tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      allowanceType,
    ),
    spender: tradeQuoteStep.allowanceContract,
    to,
    chainId: tradeQuoteStep.sellAsset.chainId,
  })

  const { networkFeeCryptoBaseUnit } = await getFeesWithWallet({
    accountNumber: tradeQuoteStep.accountNumber,
    adapter,
    data,
    to,
    value: '0',
    wallet,
  })

  return networkFeeCryptoBaseUnit
}

export const approveTrade = async ({
  tradeQuoteStep,
  wallet,
  allowanceType,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  wallet: HDWallet
  allowanceType: AllowanceType
}): Promise<string> => {
  const txHash = await approve({
    assetId: tradeQuoteStep.sellAsset.assetId,
    accountNumber: tradeQuoteStep.accountNumber,
    amountCryptoBaseUnit: getApprovalAmountCryptoBaseUnit(
      tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      allowanceType,
    ),
    spender: tradeQuoteStep.allowanceContract,
    wallet,
  })

  return txHash
}
