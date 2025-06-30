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

    // affiliate name is for mayachain, not thorchain
    if (affiliateName === MAYACHAIN_AFFILIATE_NAME) return

    // unknown affiliate name
    if (affiliateName !== THORCHAIN_AFFILIATE_NAME) {
      // action could be for either thorchain or mayachain
      if (mayachainSupportedActions.includes(action.toLowerCase())) {
        const { data } = await this.axiosMidgard.get<ActionsResponse>(
          `/actions?txid=${txid.replace(/^0x/, '')}`,
        )
        if (
          // no actions returned by midgard means the transaction did not use thorchain or has not been indexed yet,
          // we can't reliably parse in either case...
          !data.actions.length ||
          // send actions are just regular transactions and should not be parsed
          (data.actions.length === 1 && data.actions[0].type === 'send')
        ) {
          return
        }
      }
    }

    return this._parse(memo)
  }
}
