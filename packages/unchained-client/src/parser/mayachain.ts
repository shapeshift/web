import { Dex } from '../types'
import { THORCHAIN_AFFILIATE_NAME } from './thorchain'
import type { ActionsResponse, TxSpecific } from './thormaya'
import { getAffiliateName, Parser as ThorMayaParser } from './thormaya'

export type * from './thormaya'

export const MAYACHAIN_AFFILIATE_NAME = 'ssmaya'

export const mayachainSupportedActions = [
  'swap',
  '=',
  's',
  'add',
  '+',
  'a',
  'withdraw',
  '-',
  'wd',
  'out',
  'refund',
]

export interface ParserArgs {
  midgardUrl: string
}

export class Parser extends ThorMayaParser {
  constructor(args: ParserArgs) {
    super({ ...args, dexName: Dex.Maya, parserName: 'mayachain' })
  }

  async parse(memo: string, txid: string): Promise<TxSpecific | undefined> {
    const [action] = memo.split(':')
    const affiliateName = getAffiliateName(memo)

    // affiliate name is for thorchain, not mayachain
    if (affiliateName === THORCHAIN_AFFILIATE_NAME) return

    // action is not supported by mayachain
    if (!mayachainSupportedActions.includes(action.toLowerCase())) return

    // unknown affiliate name
    if (affiliateName !== MAYACHAIN_AFFILIATE_NAME) {
      const { data } = await this.axiosMidgard.get<ActionsResponse>(
        `/actions?txid=${txid.replace(/^0x/, '')}`,
      )
      if (
        // no actions returned by midgard means the transaction did not use mayachain or has not been indexed yet,
        // we can't reliably parse in either case...
        !data.actions.length ||
        // send actions are just regular transactions and should not be parsed
        (data.actions.length === 1 && data.actions[0].type === 'send')
      ) {
        return
      }
    }

    return this._parse(memo)
  }
}
