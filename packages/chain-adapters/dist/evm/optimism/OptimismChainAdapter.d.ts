import type { AssetId } from '@shapeshiftoss/caip';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import * as unchained from '@shapeshiftoss/unchained-client';
import type { FeeDataEstimate, GetFeeDataInput } from '../../types';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../EvmBaseAdapter';
import { EvmBaseAdapter } from '../EvmBaseAdapter';
import type { GasFeeDataEstimate } from '../types';
export declare const isOptimismChainAdapter: (adapter: unknown) => adapter is ChainAdapter;
export declare class ChainAdapter extends EvmBaseAdapter<KnownChainIds.OptimismMainnet> {
    static readonly defaultBIP44Params: BIP44Params;
    private readonly api;
    constructor(args: ChainAdapterArgs<unchained.optimism.V1Api>);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.OptimismMainnet;
    getFeeAssetId(): AssetId;
    getGasFeeData(): Promise<GasFeeDataEstimate>;
    getFeeData(input: GetFeeDataInput<KnownChainIds.OptimismMainnet>): Promise<FeeDataEstimate<KnownChainIds.OptimismMainnet>>;
}
