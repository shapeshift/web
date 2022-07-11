import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'

import { AvalancheTx } from '../../../generated/avalanche'
import { BaseTransactionParser, TransactionParserArgs } from '../../parser'

export class TransactionParser extends BaseTransactionParser<AvalancheTx> {
  constructor(args: TransactionParserArgs) {
    super(args)

    this.assetId = toAssetId({
      chainId: this.chainId,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.AvalancheC
    })
  }
}
