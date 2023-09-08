import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds } from '@shapeshiftoss/types';
import * as unchained from '@shapeshiftoss/unchained-client';
import type { ChainAdapter as IChainAdapter } from '../api';
import type { Account, BuildSendApiTxInput, BuildSendTxInput, FeeDataEstimate, GetAddressInput, GetBIP44ParamsInput, GetFeeDataInput, SignTx, SignTxInput, SubscribeError, SubscribeTxsInput, Transaction, TxHistoryInput, TxHistoryResponse, ValidAddressResult } from '../types';
import type { cosmos, thorchain } from './';
import type { BuildTransactionInput, Validator, ValidatorAction } from './types';
export declare const assertIsValidatorAddress: (validator: string, chainId: CosmosSdkChainId) => void;
export declare const cosmosSdkChainIds: readonly [KnownChainIds.CosmosMainnet, KnownChainIds.ThorchainMainnet];
export type CosmosSdkChainId = (typeof cosmosSdkChainIds)[number];
export type CosmosSdkChainAdapter = cosmos.ChainAdapter | thorchain.ChainAdapter;
type Denom = 'uatom' | 'rune';
export interface ChainAdapterArgs {
    chainId?: CosmosSdkChainId;
    coinName: string;
    providers: {
        http: unchained.cosmos.V1Api | unchained.thorchain.V1Api;
        ws: unchained.ws.Client<unchained.cosmossdk.Tx>;
    };
}
export interface CosmosSdkBaseAdapterArgs extends ChainAdapterArgs {
    assetId: AssetId;
    chainId: CosmosSdkChainId;
    defaultBIP44Params: BIP44Params;
    denom: Denom;
    parser: unchained.cosmossdk.BaseTransactionParser<unchained.cosmossdk.Tx>;
    supportedChainIds: ChainId[];
}
export declare abstract class CosmosSdkBaseAdapter<T extends CosmosSdkChainId> implements IChainAdapter<T> {
    protected readonly chainId: CosmosSdkChainId;
    protected readonly coinName: string;
    protected readonly defaultBIP44Params: BIP44Params;
    protected readonly supportedChainIds: ChainId[];
    protected readonly providers: {
        http: unchained.cosmos.V1Api | unchained.thorchain.V1Api;
        ws: unchained.ws.Client<unchained.cosmossdk.Tx>;
    };
    protected assetId: AssetId;
    protected denom: string;
    protected parser: unchained.cosmossdk.BaseTransactionParser<unchained.cosmossdk.Tx>;
    protected constructor(args: CosmosSdkBaseAdapterArgs);
    abstract getType(): T;
    abstract getFeeAssetId(): AssetId;
    abstract getName(): string;
    abstract getDisplayName(): string;
    abstract buildSendApiTransaction(tx: BuildSendApiTxInput<T>): Promise<{
        txToSign: SignTx<T>;
    }>;
    abstract buildSendTransaction(tx: BuildSendTxInput<T>): Promise<{
        txToSign: SignTx<T>;
    }>;
    abstract getAddress(input: GetAddressInput): Promise<string>;
    abstract getFeeData(input: Partial<GetFeeDataInput<T>>): Promise<FeeDataEstimate<T>>;
    abstract signTransaction(signTxInput: SignTxInput<SignTx<T>>): Promise<string>;
    abstract signAndBroadcastTransaction(signTxInput: SignTxInput<SignTx<T>>): Promise<string>;
    getChainId(): ChainId;
    getBIP44Params({ accountNumber }: GetBIP44ParamsInput): BIP44Params;
    getAccount(pubkey: string): Promise<Account<T>>;
    getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse>;
    protected getAmount({ account, value, fee, sendMax, validatorAction, }: {
        account: Account<T>;
        value: string;
        fee: string;
        sendMax?: boolean;
        validatorAction?: ValidatorAction;
    }): string;
    protected buildTransaction<U extends CosmosSdkChainId>(input: BuildTransactionInput<CosmosSdkChainId>): {
        txToSign: SignTx<U>;
    };
    broadcastTransaction(hex: string): Promise<string>;
    validateAddress(address: string): Promise<ValidAddressResult>;
    subscribeTxs(input: SubscribeTxsInput, onMessage: (msg: Transaction) => void, onError: (err: SubscribeError) => void): Promise<void>;
    unsubscribeTxs(input?: SubscribeTxsInput): void;
    closeTxs(): void;
    getValidators(): Promise<Validator[]>;
    getValidator(address: string): Promise<Validator | undefined>;
}
export {};
