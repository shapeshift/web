import type { Token as ParserToken } from '../../../../types'
import type { Token as ApiToken } from '../../types'

export const usdcApiToken: ApiToken = {
  id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  type: 'FungibleToken',
}

export const usdcParserToken: ParserToken = {
  contract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
}
