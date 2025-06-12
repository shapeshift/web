import { Parser as MayachainParser } from '../../../parser/mayachain'
import type { SubParser, Tx, TxSpecific } from '../../parser'

export interface ParserArgs {
  midgardUrl: string
}

export class Parser implements SubParser<Tx> {
  private readonly mayachainParser: MayachainParser

  constructor(args: ParserArgs) {
    this.mayachainParser = new MayachainParser({ midgardUrl: args.midgardUrl })
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    const messageMemoEvent = Object.values(tx.events).find(event => !!event['message']?.['memo'])
    const messageMemo = messageMemoEvent?.['message']?.['memo']

    const outboundMemoEvent = Object.values(tx.events).find(event => !!event['outbound']?.['memo'])
    const outboundMemo = outboundMemoEvent?.['outbound']?.['memo']

    const memo = messageMemo || outboundMemo

    if (!memo) return

    const txSpecific = await this.mayachainParser.parse(memo)

    // special case for native thorchain transactions
    const outboundEventIndex = tx.messages.find(msg => msg.type === 'outbound')?.index
    const outboundEvent = tx.events[outboundEventIndex ?? '']?.['outbound']
    const refundEvent = tx.events[outboundEventIndex ?? '']?.['refund']
    if (!!outboundEvent) {
      switch (txSpecific?.data?.method) {
        // contains both the withdraw request and withdraw outbound
        case 'withdraw':
          txSpecific.data.method = 'withdrawNative'
          break
        // contains both the deposit and refund outbound
        case 'deposit':
          txSpecific.data.method = 'depositRefundNative'
          break
        default: {
          if (txSpecific) break

          // generic fallback metadata if the mayachain parser didn't return anything
          const method = !!refundEvent ? 'refund' : 'out'
          return { data: { parser: 'mayachain', memo: outboundEvent['memo'], method } }
        }
      }
    }

    return txSpecific
  }
}
