import type { ChainId } from '@shapeshiftoss/caip'

import { Parser as MayachainParser } from '../../parser/mayachain'
import { Parser as ThorchainParser } from './thorchain'

export interface ParserArgs {
  chainId: ChainId
  midgardUrl: string
  rpcUrl: string
}

export class Parser extends ThorchainParser {
  constructor(args: ParserArgs) {
    super(args)

    this.parser = new MayachainParser({ midgardUrl: args.midgardUrl })
  }
}
