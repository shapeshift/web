import { GetQuoteInput, Quote, Swapper, SwapperType } from '../../api'
import { getZrxQuote } from './getQuote/getQuote'
export class ZrxError extends Error {
  constructor(message: string) {
    super(message)
    this.message = `ZrxError:${message}`
  }
}
export class ZrxSwapper implements Swapper {
  getType() {
    return SwapperType.Zrx
  }

  /**
   * Get a basic quote (rate) for the pair
   * @param input
   */
  async getQuote(input: GetQuoteInput): Promise<Quote | undefined> {
    return getZrxQuote(input)
  }
}
