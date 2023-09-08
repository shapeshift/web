import type { AssetId } from '@shapeshiftoss/caip';
import type { CosmosSignTx } from '@shapeshiftoss/hdwallet-core';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import type { BuildClaimRewardsTxInput, BuildDelegateTxInput, BuildRedelegateTxInput, BuildSendApiTxInput, BuildSendTxInput, BuildUndelegateTxInput, FeeDataEstimate, GetAddressInput, GetFeeDataInput, SignTxInput } from '../../types';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../CosmosSdkBaseAdapter';
import { CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter';
export declare const MIN_FEE = "2500";
export declare class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.CosmosMainnet> {
    static readonly defaultBIP44Params: BIP44Params;
    constructor(args: ChainAdapterArgs);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.CosmosMainnet;
    getFeeAssetId(): AssetId;
    getAddress(input: GetAddressInput): Promise<string>;
    buildSendApiTransaction(input: BuildSendApiTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    buildSendTransaction(input: BuildSendTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    buildDelegateTransaction(tx: BuildDelegateTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    buildUndelegateTransaction(tx: BuildUndelegateTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    buildRedelegateTransaction(tx: BuildRedelegateTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    buildClaimRewardsTransaction(tx: BuildClaimRewardsTxInput<KnownChainIds.CosmosMainnet>): Promise<{
        txToSign: CosmosSignTx;
    }>;
    signTransaction(signTxInput: SignTxInput<CosmosSignTx>): Promise<string>;
    getFeeData(_: Partial<GetFeeDataInput<KnownChainIds.CosmosMainnet>>): Promise<FeeDataEstimate<KnownChainIds.CosmosMainnet>>;
    signAndBroadcastTransaction(signTxInput: SignTxInput<CosmosSignTx>): Promise<string>;
}
