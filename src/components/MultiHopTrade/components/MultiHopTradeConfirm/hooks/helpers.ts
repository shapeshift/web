import { fromAssetId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/dist/swappers/utils/constants'
import { assertGetEvmChainAdapter, getApproveContractData, getFeesWithWallet } from 'lib/utils/evm'
import { approve } from 'lib/utils/evm/approve'

export const getApprovalNetworkFeeCryptoBaseUnit = async ({
  tradeQuoteStep,
  wallet,
  isExactAllowance,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  wallet: HDWallet
  isExactAllowance: boolean
}): Promise<string> => {
  const adapter = assertGetEvmChainAdapter(tradeQuoteStep.sellAsset.chainId)

  const approvalAmountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const { assetReference: to } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
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
  isExactAllowance,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  wallet: HDWallet
  isExactAllowance: boolean
}): Promise<string> => {
  const amountCryptoBaseUnit = isExactAllowance
    ? tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
    : MAX_ALLOWANCE

  const txHash = await approve({
    assetId: tradeQuoteStep.sellAsset.assetId,
    accountNumber: tradeQuoteStep.accountNumber,
    amountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    wallet,
  })

  return txHash
}
