import type { AssetId } from '@shapeshiftoss/caip';
import type { ThorchainSignTx } from '@shapeshiftoss/hdwallet-core';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import type { BuildDepositTxInput, BuildSendApiTxInput, BuildSendTxInput, FeeDataEstimate, GetAddressInput, GetFeeDataInput, SignTxInput } from '../../types';
import { ChainAdapterDisplayName } from '../../types';
import type { ChainAdapterArgs } from '../CosmosSdkBaseAdapter';
import { CosmosSdkBaseAdapter } from '../CosmosSdkBaseAdapter';
export declare class ChainAdapter extends CosmosSdkBaseAdapter<KnownChainIds.ThorchainMainnet> {
    static readonly defaultBIP44Params: BIP44Params;
    constructor(args: ChainAdapterArgs);
    getDisplayName(): ChainAdapterDisplayName;
    getName(): string;
    getType(): KnownChainIds.ThorchainMainnet;
    getFeeAssetId(): AssetId;
    getAddress(input: GetAddressInput): Promise<string>;
    signTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string>;
    buildSendApiTransaction(input: BuildSendApiTxInput<KnownChainIds.ThorchainMainnet>): Promise<{
        txToSign: ThorchainSignTx;
    }>;
    buildSendTransaction(input: BuildSendTxInput<KnownChainIds.ThorchainMainnet>): Promise<{
        txToSign: ThorchainSignTx;
    }>;
    buildDepositTransaction(input: BuildDepositTxInput<KnownChainIds.ThorchainMainnet>): Promise<{
        txToSign: ThorchainSignTx;
    }>;
    getFeeData(_: Partial<GetFeeDataInput<KnownChainIds.ThorchainMainnet>>): Promise<FeeDataEstimate<KnownChainIds.ThorchainMainnet>>;
    signAndBroadcastTransaction(signTxInput: SignTxInput<ThorchainSignTx>): Promise<string>;
}
