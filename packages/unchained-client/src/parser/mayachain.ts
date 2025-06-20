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

    // affiliate name is for thorchain
    if (affiliateName === THORCHAIN_AFFILIATE_NAME) return

    // action is not supported by mayachain
    if (!mayachainSupportedActions.includes(action.toLowerCase())) return

    // unknown affiliate name with no actions returned by mayachain midgard
    if (affiliateName !== MAYACHAIN_AFFILIATE_NAME) {
      const { data } = await this.axiosMidgard.get<ActionsResponse>(`/actions?txid=${txid}`)
      if (!data.actions.length) return
    }

    return this._parse(memo)
  }
}
