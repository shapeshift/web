import * as mayachain from '../../parser/mayachain'
import * as thormaya from './thormaya'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser extends thormaya.Parser {
  constructor(args: ParserArgs) {
    super({ parser: new mayachain.Parser({ midgardUrl: args.midgardUrl }) })
  }
}
