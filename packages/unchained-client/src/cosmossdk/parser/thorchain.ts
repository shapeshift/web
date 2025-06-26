import * as thorchain from '../../parser/thorchain'
import * as thormaya from './thormaya'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser extends thormaya.Parser {
  constructor(args: ParserArgs) {
    super({ parser: new thorchain.Parser({ midgardUrl: args.midgardUrl }) })
  }
}
