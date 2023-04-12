import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { convertPrecision } from 'lib/bignumber/bignumber'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { selectAccountIdByAccountNumberAndChainId } from 'state/slices/selectors'
import { store } from 'state/store'

export const getAssetBalance = ({
  asset,
  accountNumber,
  chainId,
  outputPrecision,
}: {
  asset: Asset
  accountNumber: number
  chainId: ChainId
  outputPrecision: number
}) => {
  const accountId = selectAccountIdByAccountNumberAndChainId(store.getState(), {
    accountNumber,
    chainId,
  })

  if (accountId === undefined) {
    throw new SwapError('[getTradeQuote] no account id found', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
    })
  }

  const balance = selectPortfolioCryptoBalanceBaseUnitByFilter(store.getState(), {
    accountId,
    assetId: asset.assetId,
  })

  return convertPrecision({
    value: balance,
    inputPrecision: asset.precision,
    outputPrecision,
  })
}
