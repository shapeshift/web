import type { AssetId, ChainId } from '@shapeshiftoss/caip';
import type { HDWallet, PublicKey } from '@shapeshiftoss/hdwallet-core';
import type { BIP44Params } from '@shapeshiftoss/types';
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types';
import type * as unchained from '@shapeshiftoss/unchained-client';
import type { ChainAdapter as IChainAdapter } from '../api';
import type { Account, BuildSendTxInput, FeeDataEstimate, GetBIP44ParamsInput, GetFeeDataInput, SignTx, SignTxInput, SubscribeError, SubscribeTxsInput, Transaction, TxHistoryInput, TxHistoryResponse, UtxoBuildSendApiTxInput, ValidAddressResult } from '../types';
import type { bitcoin, bitcoincash, dogecoin, litecoin } from './';
import type { GetAddressInput } from './types';
export declare const utxoChainIds: readonly [KnownChainIds.BitcoinMainnet, KnownChainIds.BitcoinCashMainnet, KnownChainIds.DogecoinMainnet, KnownChainIds.LitecoinMainnet];
export type UtxoChainId = (typeof utxoChainIds)[number];
export type UtxoChainAdapter = bitcoin.ChainAdapter | bitcoincash.ChainAdapter | dogecoin.ChainAdapter | litecoin.ChainAdapter;
export interface ChainAdapterArgs {
    chainId?: UtxoChainId;
    coinName: string;
    providers: {
        http: unchained.bitcoin.V1Api | unchained.bitcoincash.V1Api | unchained.dogecoin.V1Api | unchained.litecoin.V1Api;
        ws: unchained.ws.Client<unchained.utxo.types.Tx>;
    };
}
export interface UtxoBaseAdapterArgs extends ChainAdapterArgs {
    assetId: AssetId;
    chainId: UtxoChainId;
    defaultBIP44Params: BIP44Params;
    defaultUtxoAccountType: UtxoAccountType;
    parser: unchained.utxo.BaseTransactionParser<unchained.utxo.types.Tx>;
    supportedAccountTypes: UtxoAccountType[];
    supportedChainIds: ChainId[];
}
export declare abstract class UtxoBaseAdapter<T extends UtxoChainId> implements IChainAdapter<T> {
    protected readonly chainId: UtxoChainId;
    protected readonly coinName: string;
    protected readonly defaultBIP44Params: BIP44Params;
    protected readonly defaultUtxoAccountType: UtxoAccountType;
    protected readonly supportedChainIds: ChainId[];
    protected readonly supportedAccountTypes: UtxoAccountType[];
    protected readonly providers: {
        http: unchained.bitcoin.V1Api | unchained.bitcoincash.V1Api | unchained.dogecoin.V1Api | unchained.litecoin.V1Api;
        ws: unchained.ws.Client<unchained.utxo.types.Tx>;
    };
    protected assetId: AssetId;
    protected accountAddresses: Record<string, string[]>;
    protected parser: unchained.utxo.BaseTransactionParser<unchained.utxo.types.Tx>;
    protected constructor(args: UtxoBaseAdapterArgs);
    abstract getType(): T;
    abstract getFeeAssetId(): AssetId;
    abstract getName(): string;
    abstract getDisplayName(): string;
    private assertIsAccountTypeSupported;
    getChainId(): ChainId;
    getSupportedAccountTypes(): UtxoAccountType[];
    getCoinName(): string;
    getBIP44Params({ accountNumber, accountType, index, isChange, }: GetBIP44ParamsInput): BIP44Params;
    getAccount(pubkey: string): Promise<Account<T>>;
    getAddress({ wallet, accountNumber, accountType, index, isChange, showOnDevice, }: GetAddressInput): Promise<string>;
    buildSendApiTransaction(input: UtxoBuildSendApiTxInput<T>): Promise<SignTx<T>>;
    buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
        txToSign: SignTx<T>;
    }>;
    getFeeData({ to, value, chainSpecific: { from, pubkey, opReturnData }, sendMax, }: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>>;
    signTransaction({ txToSign, wallet }: SignTxInput<SignTx<T>>): Promise<string>;
    getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse>;
    broadcastTransaction(hex: string): Promise<string>;
    subscribeTxs(input: SubscribeTxsInput, onMessage: (msg: Transaction) => void, onError: (err: SubscribeError) => void): Promise<void>;
    unsubscribeTxs(input?: SubscribeTxsInput): void;
    closeTxs(): void;
    validateAddress(address: string): Promise<ValidAddressResult>;
    getPublicKey(wallet: HDWallet, accountNumber: number, accountType: UtxoAccountType): Promise<PublicKey>;
}
