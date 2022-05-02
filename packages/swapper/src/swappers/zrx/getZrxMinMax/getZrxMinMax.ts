import { ChainTypes, GetQuoteInput, MinMaxOutput } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

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

  const minimum = new BigNumber(1).dividedBy(new BigNumber(usdRate)).toString()

  return {
    minimum,
    maximum: MAX_ZRX_TRADE
  }
}
