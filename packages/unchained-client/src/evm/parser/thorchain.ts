import type { ChainId } from '@shapeshiftoss/caip'

import * as thorchain from '../../parser/thorchain'
import * as thormaya from './thormaya'

export interface ParserArgs {
  chainId: ChainId
  midgardUrl: string
}

export class Parser extends thormaya.Parser {
  constructor(args: ParserArgs) {
    super({
      chainId: args.chainId,
      parser: new thorchain.Parser({ midgardUrl: args.midgardUrl }),
    })
  }
}
