import { Dex } from '../types'
import { MAYACHAIN_AFFILIATE_NAME, mayachainSupportedActions } from './mayachain'
import type { ActionsResponse, TxSpecific } from './thormaya'
import { getAffiliateName, Parser as ThorMayaParser } from './thormaya'

export type * from './thormaya'

export const THORCHAIN_AFFILIATE_NAME = 'ss'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser extends ThorMayaParser {
  constructor(args: ParserArgs) {
    super({ ...args, dexName: Dex.Thor, parserName: 'thorchain' })
  }

  async parse(memo: string, txid: string): Promise<TxSpecific | undefined> {
    const [action] = memo.split(':')
    const affiliateName = getAffiliateName(memo)

    // affiliate name is for mayachain
    if (affiliateName === MAYACHAIN_AFFILIATE_NAME) return

    // unknown affiliate name with no actions returned by thorchain midgard
    if (affiliateName !== THORCHAIN_AFFILIATE_NAME) {
      if (mayachainSupportedActions.includes(action.toLowerCase())) {
        const { data } = await this.axiosMidgard.get<ActionsResponse>(`/actions?txid=${txid}`)
        if (!data.actions.length) return
      }
    }

    return this._parse(memo)
  }
}
