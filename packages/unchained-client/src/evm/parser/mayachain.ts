import type { ChainId } from '@shapeshiftoss/caip'

import * as mayachain from '../../parser/mayachain'
import * as thormaya from './thormaya'

export interface ParserArgs {
  chainId: ChainId
  midgardUrl: string
}

export class Parser extends thormaya.Parser {
  constructor(args: ParserArgs) {
    super({
      chainId: args.chainId,
      parser: new mayachain.Parser({ midgardUrl: args.midgardUrl }),
    })
  }
}
