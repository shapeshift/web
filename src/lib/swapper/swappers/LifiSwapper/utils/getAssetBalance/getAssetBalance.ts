import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { selectPortfolioCryptoBalanceBaseUnitByFilter } from 'state/slices/common-selectors'
import { selectAccountIdByAccountNumberAndChainId } from 'state/slices/selectors'
import { store } from 'state/store'

export const getAssetBalance = ({
  asset,
  accountNumber,
  chainId,
}: {
  asset: Asset
  accountNumber: number
  chainId: ChainId
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

  return selectPortfolioCryptoBalanceBaseUnitByFilter(store.getState(), {
    accountId,
    assetId: asset.assetId,
  })
}
