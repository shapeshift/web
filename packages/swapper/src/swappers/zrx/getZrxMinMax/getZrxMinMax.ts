import { ChainTypes, GetQuoteInput, MinMaxOutput } from '@shapeshiftoss/types'

import { bnOrZero } from '../utils/bignumber'
import { MAX_ZRX_TRADE } from '../utils/constants'
import { getUsdRate } from '../utils/helpers/helpers'
import { ZrxError } from '../ZrxSwapper'

export const getZrxMinMax = async (
  input: Pick<GetQuoteInput, 'sellAsset' | 'buyAsset'>
): Promise<MinMaxOutput> => {
  const { sellAsset, buyAsset } = input

  if (sellAsset.chain !== ChainTypes.Ethereum || buyAsset.chain !== ChainTypes.Ethereum) {
    throw new ZrxError('getZrxMinMax - must be eth assets')
  }

  const usdRate = await getUsdRate({
    symbol: sellAsset.symbol,
    tokenId: sellAsset.tokenId
  })

  const minimum = bnOrZero(1).dividedBy(bnOrZero(usdRate)).toString()

  return {
    minimum, // $1 worth of the sell token.
    maximum: MAX_ZRX_TRADE // Arbitrarily large value. 10e+28 here.
  }
}
