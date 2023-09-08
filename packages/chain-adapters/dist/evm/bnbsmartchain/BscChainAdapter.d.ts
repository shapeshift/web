import type { AssetId } from '@shapeshiftoss/caip';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import * as unchained from '@shapeshiftoss/unchained-client';
import type { FeeDataEstimate, GetFeeDataInput } from '../../types';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../EvmBaseAdapter';
import { EvmBaseAdapter } from '../EvmBaseAdapter';
import type { GasFeeDataEstimate } from '../types';
export declare class ChainAdapter extends EvmBaseAdapter<KnownChainIds.BnbSmartChainMainnet> {
    static readonly defaultBIP44Params: BIP44Params;
    constructor(args: ChainAdapterArgs<unchained.bnbsmartchain.V1Api>);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.BnbSmartChainMainnet;
    getFeeAssetId(): AssetId;
    getGasFeeData(): Promise<GasFeeDataEstimate & {
        baseFeePerGas?: string;
    }>;
    getFeeData(input: GetFeeDataInput<KnownChainIds.BnbSmartChainMainnet>): Promise<FeeDataEstimate<KnownChainIds.BnbSmartChainMainnet>>;
}
