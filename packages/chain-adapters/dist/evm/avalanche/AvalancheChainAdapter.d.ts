import type { AssetId } from '@shapeshiftoss/caip';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import * as unchained from '@shapeshiftoss/unchained-client';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../EvmBaseAdapter';
import { EvmBaseAdapter } from '../EvmBaseAdapter';
export declare class ChainAdapter extends EvmBaseAdapter<KnownChainIds.AvalancheMainnet> {
    static readonly defaultBIP44Params: BIP44Params;
    constructor(args: ChainAdapterArgs<unchained.avalanche.V1Api>);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.AvalancheMainnet;
    getFeeAssetId(): AssetId;
}
