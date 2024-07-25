import { fromAssetId } from '@shapeshiftoss/caip'
import { type evm, type EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { type ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import { MAX_ALLOWANCE } from '@shapeshiftoss/swapper/dist/swappers/utils/constants'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { getFees } from '@shapeshiftoss/utils/dist/evm'
import { getApproveContractData } from 'lib/utils/evm'

export enum AllowanceType {
  Exact,
  Unlimited,
  Reset,
}

export const getApprovalTxData = async ({
  tradeQuoteStep,
  adapter,
  wallet,
  from,
  supportsEIP1559,
  allowanceType,
}: {
  tradeQuoteStep: TradeQuote['steps'][number]
  adapter: EvmChainAdapter
  wallet: ETHWallet
  from: string
  supportsEIP1559: boolean
  allowanceType: AllowanceType
}): Promise<{ buildCustomTxInput: evm.BuildCustomTxInput; networkFeeCryptoBaseUnit: string }> => {
  const approvalAmountCryptoBaseUnit = (() => {
    switch (allowanceType) {
      case AllowanceType.Exact:
        return tradeQuoteStep.sellAmountIncludingProtocolFeesCryptoBaseUnit
      case AllowanceType.Unlimited:
        return MAX_ALLOWANCE
      case AllowanceType.Reset:
        return '0'
      default:
        assertUnreachable(allowanceType)
    }
  })()

  const { assetReference } = fromAssetId(tradeQuoteStep.sellAsset.assetId)

  const value = '0'

  const data = getApproveContractData({
    approvalAmountCryptoBaseUnit,
    spender: tradeQuoteStep.allowanceContract,
    to: assetReference,
    chainId: tradeQuoteStep.sellAsset.chainId,
  })

  const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
    adapter,
    to: assetReference,
    value,
    data,
    from,
    supportsEIP1559,
  })

  return {
    networkFeeCryptoBaseUnit,
    buildCustomTxInput: {
      accountNumber: tradeQuoteStep.accountNumber,
      data,
      to: assetReference,
      value,
      wallet,
      ...fees,
    },
  }
}
