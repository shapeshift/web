import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import type { ETHSignMessage, ETHSignTx, ETHSignTypedData, ETHWallet, HDWallet } from '@shapeshiftoss/hdwallet-core';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import type * as unchained from '@shapeshiftoss/unchained-client';
import type { ChainAdapter as IChainAdapter } from '../api';
import type { Account, BuildSendApiTxInput, BuildSendTxInput, FeeDataEstimate, GetAddressInput, GetBIP44ParamsInput, GetFeeDataInput, SignMessageInput, SignTx, SignTxInput, SignTypedDataInput, SubscribeError, SubscribeTxsInput, Transaction, TxHistoryInput, TxHistoryResponse, ValidAddressResult } from '../types';
import type { avalanche, bnbsmartchain, ethereum, gnosis, optimism, polygon } from '.';
import type { BuildCustomApiTxInput, BuildCustomTxInput, EstimateGasRequest, GasFeeDataEstimate } from './types';
export declare const evmChainIds: readonly [KnownChainIds.EthereumMainnet, KnownChainIds.AvalancheMainnet, KnownChainIds.OptimismMainnet, KnownChainIds.BnbSmartChainMainnet, KnownChainIds.PolygonMainnet, KnownChainIds.GnosisMainnet];
export type EvmChainId = (typeof evmChainIds)[number];
export type EvmChainAdapter = ethereum.ChainAdapter | avalanche.ChainAdapter | optimism.ChainAdapter | bnbsmartchain.ChainAdapter | polygon.ChainAdapter | gnosis.ChainAdapter;
export declare const isEvmChainId: (maybeEvmChainId: string | EvmChainId) => maybeEvmChainId is KnownChainIds.EthereumMainnet | KnownChainIds.AvalancheMainnet | KnownChainIds.OptimismMainnet | KnownChainIds.BnbSmartChainMainnet | KnownChainIds.PolygonMainnet | KnownChainIds.GnosisMainnet;
export interface ChainAdapterArgs<T = unchained.evm.Api> {
    chainId?: EvmChainId;
    providers: {
        http: T;
        ws: unchained.ws.Client<unchained.evm.types.Tx>;
    };
    rpcUrl: string;
}
export interface EvmBaseAdapterArgs extends ChainAdapterArgs {
    assetId: AssetId;
    chainId: EvmChainId;
    defaultBIP44Params: BIP44Params;
    supportedChainIds: ChainId[];
    parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>;
}
export declare abstract class EvmBaseAdapter<T extends EvmChainId> implements IChainAdapter<T> {
    protected readonly chainId: EvmChainId;
    protected readonly defaultBIP44Params: BIP44Params;
    protected readonly supportedChainIds: ChainId[];
    protected readonly providers: {
        http: unchained.evm.Api;
        ws: unchained.ws.Client<unchained.evm.types.Tx>;
    };
    protected rpcUrl: string;
    protected assetId: AssetId;
    protected parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>;
    protected constructor(args: EvmBaseAdapterArgs);
    abstract getType(): T;
    abstract getFeeAssetId(): AssetId;
    abstract getName(): string;
    abstract getDisplayName(): string;
    getChainId(): ChainId;
    getRpcUrl(): string;
    getBIP44Params({ accountNumber }: GetBIP44ParamsInput): BIP44Params;
    supportsChain(wallet: HDWallet, chainReference?: number): wallet is ETHWallet;
    assertSwitchChain(wallet: ETHWallet): Promise<void>;
    buildSendApiTransaction(input: BuildSendApiTxInput<T>): Promise<SignTx<T>>;
    buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
        txToSign: SignTx<T>;
    }>;
    protected buildEstimateGasRequest({ to, value, chainSpecific: { contractAddress, from, data }, sendMax, }: GetFeeDataInput<T>): Promise<EstimateGasRequest>;
    getAccount(pubkey: string): Promise<Account<T>>;
    getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse>;
    signTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string>;
    signAndBroadcastTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string>;
    broadcastTransaction(hex: string): Promise<string>;
    signMessage(signMessageInput: SignMessageInput<ETHSignMessage>): Promise<string>;
    signTypedData(input: SignTypedDataInput<ETHSignTypedData>): Promise<string>;
    getAddress(input: GetAddressInput): Promise<string>;
    validateAddress(address: string): Promise<ValidAddressResult>;
    subscribeTxs(input: SubscribeTxsInput, onMessage: (msg: Transaction) => void, onError: (err: SubscribeError) => void): Promise<void>;
    unsubscribeTxs(input?: SubscribeTxsInput): void;
    closeTxs(): void;
    buildCustomApiTx(input: BuildCustomApiTxInput): Promise<SignTx<T>>;
    buildCustomTx(input: BuildCustomTxInput): Promise<{
        txToSign: SignTx<T>;
    }>;
    getGasFeeData(): Promise<GasFeeDataEstimate>;
    getFeeData(input: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>>;
    get httpProvider(): unchained.evm.Api;
    get wsProvider(): unchained.ws.Client<unchained.evm.types.Tx>;
}
