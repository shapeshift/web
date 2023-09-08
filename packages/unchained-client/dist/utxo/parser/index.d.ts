import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import type { utxo } from '@shapeshiftoss/common-api';
import type { ParsedTx } from '../../types';
export interface BaseTransactionParserArgs {
    chainId: ChainId;
    assetId: AssetId;
}
export declare class BaseTransactionParser<T extends utxo.Tx> {
    chainId: ChainId;
    assetId: AssetId;
    constructor(args: BaseTransactionParserArgs);
    parse(tx: T, address: string): Promise<ParsedTx>;
}
