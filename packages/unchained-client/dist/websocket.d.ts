/// <reference types="ws" />
/// <reference types="node" />
import type { ErrorResponse, Topics, TxsTopicData } from '@shapeshiftoss/common-api';
import WebSocket from 'isomorphic-ws';
export interface Connection {
    ws?: WebSocket;
    pingTimeout?: NodeJS.Timeout;
    interval?: NodeJS.Timeout;
}
export interface TransactionMessage<T> {
    address: string;
    data: T;
    subscriptionId: string;
}
export interface TxsParams<T> {
    data: TxsTopicData;
    onMessage: (message: TransactionMessage<T>) => void;
    onError?: (err: ErrorResponse) => void;
}
export type SubscriptionId = string;
export declare class Client<T> {
    private readonly url;
    private readonly connections;
    private readonly pingInterval;
    private readonly retryAttempts;
    private retryCount;
    private txs;
    constructor(url: string);
    private initialize;
    private onOpen;
    private onClose;
    private onError;
    private onMessage;
    private heartbeat;
    private getDefaultSubscriptionId;
    /**
     * Subscribe to transaction history and updates for newly confirmed and pending transactions.
     *
     * - Subsequent calls to `subscribeTxs` for the same `subscriptionId` will add additional addresses to be watched.
     *
     * @param subscriptionId unique id for grouping of addresses
     * @param data details for subscribe
     * @param data.topic specifies which topic to subscribe to
     * @param data.addresses list of addresses to subscribe to
     * @param onMessage handler for all transaction messages associated with `subscriptionId`
     * @param [onError] optional handler for any error messages associated with `subscriptionId`
     */
    subscribeTxs(subscriptionId: string, data: TxsTopicData, onMessage: (message: TransactionMessage<T>) => void, onError?: (err: ErrorResponse) => void): Promise<void>;
    /**
     * Unsubscribe from transaction history and updates for newly confirmed and pending transactions.
     *
     * - If `subscriptionId` is provided, any provided addresses will be unsubscribed from.
     *   If no addresses are provided, the subscription will be unsubscribed from.
     *
     * - If `subscriptionId` is not provided, all subscriptions will be unsubscribed from.
     *
     * @param [subscriptionId] unique identifier to unsubscribe from
     * @param [data] details for unsubscribe
     * @param data.topic specifies which topic to unsubscribe from
     * @param data.addresses list of addresses to unsubscribe from
     */
    unsubscribeTxs(subscriptionId?: string, data?: TxsTopicData): void;
    /**
     * Close and unsubscribe from any subscriptions
     *
     * - If no topic is provided, all supported topics will be closed and unsubscribed from
     *
     * @param [topic] specifies which topic to close and unsubscribe from
     */
    close(topic?: Topics): void;
}
