import { Asset, MinMaxOutput } from '@shapeshiftoss/types'

import { bn, bnOrZero } from '../utils/bignumber'
import { MAX_ZRX_TRADE } from '../utils/constants'
import { getUsdRate } from '../utils/helpers/helpers'
import { ZrxError } from '../ZrxSwapper'

export const getZrxMinMax = async (sellAsset: Asset, buyAsset: Asset): Promise<MinMaxOutput> => {
  if (sellAsset.chainId !== 'eip155:1' || buyAsset.chainId !== 'eip155:1') {
    throw new ZrxError('getZrxMinMax - must be eth assets')
  }

  const usdRate = await getUsdRate({
    symbol: sellAsset.symbol,
    tokenId: sellAsset.tokenId
  })

  const minimum = bn(1).dividedBy(bnOrZero(usdRate)).toString()

  return {
    minimum, // $1 worth of the sell token.
    maximum: MAX_ZRX_TRADE // Arbitrarily large value. 10e+28 here.
  }
}
