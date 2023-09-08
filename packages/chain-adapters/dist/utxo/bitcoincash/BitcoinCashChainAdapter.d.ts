import type { AssetId } from '@shapeshiftoss/caip';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../UtxoBaseAdapter';
import { UtxoBaseAdapter } from '../UtxoBaseAdapter';
export declare class ChainAdapter extends UtxoBaseAdapter<KnownChainIds.BitcoinCashMainnet> {
    static readonly defaultUtxoAccountType = UtxoAccountType.P2pkh;
    static readonly defaultBIP44Params: BIP44Params;
    constructor(args: ChainAdapterArgs);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.BitcoinCashMainnet;
    getFeeAssetId(): AssetId;
}
