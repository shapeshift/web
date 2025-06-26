import type * as mayachain from '../../parser/mayachain'
import type * as thorchain from '../../parser/thorchain'
import type { SubParser, Tx, TxSpecific } from '.'

interface ParserArgs {
  parser: thorchain.Parser | mayachain.Parser
}

export class Parser implements SubParser<Tx> {
  protected parser: thorchain.Parser | mayachain.Parser

  constructor(args: ParserArgs) {
    this.parser = args.parser
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    const messageMemoEvent = Object.values(tx.events).find(event => !!event['message']?.['memo'])
    const messageMemo = messageMemoEvent?.['message']?.['memo']

    const outboundMemoEvent = Object.values(tx.events).find(event => !!event['outbound']?.['memo'])
    const outboundMemo = outboundMemoEvent?.['outbound']?.['memo']

    const memo = messageMemo || outboundMemo || tx.memo

    if (!memo) return

    const txSpecific = await this.parser.parse(memo, tx.txid)

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
        // contains both the loan repayment and refund outbound
        case 'loanRepayment':
          txSpecific.data.method = 'loanRepaymentRefundNative'
          break
        default: {
          if (txSpecific) break

          // generic fallback metadata if the thorchain parser didn't return any
          const method = !!refundEvent ? 'refund' : 'out'
          return { data: { parser: this.parser.parserName, memo: outboundEvent['memo'], method } }
        }
      }
    }

    return txSpecific
  }
}
