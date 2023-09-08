"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const isomorphic_ws_1 = __importDefault(require("isomorphic-ws"));
const NORMAL_CLOSURE_CODE = 1000;
class Client {
    constructor(url) {
        this.pingInterval = 10000;
        this.retryAttempts = 5;
        this.retryCount = 0;
        this.txs = {};
        this.url = url;
        this.connections = {
            txs: undefined,
        };
    }
    async initialize() {
        const ws = new isomorphic_ws_1.default(this.url);
        this.connections.txs = { ws };
        // wait for connection to open with handshake timeout
        await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('timeout while trying to connect')), 5000);
            ws.onopen = ({ target }) => this.onOpen(target, resolve, reject);
            ws.onclose = event => this.onClose(event, resolve, reject);
            ws.onerror = event => this.onError(event);
            ws.onmessage = event => this.onMessage(event);
        });
    }
    onOpen(ws, resolve, reject) {
        this.retryCount = 0;
        const interval = setInterval(() => {
            // browsers do not support ping/pong frame, send ping payload instead
            const payload = { subscriptionId: '', method: 'ping' };
            ws.send(JSON.stringify(payload));
        }, this.pingInterval);
        this.heartbeat('txs');
        if (this.connections.txs) {
            this.connections.txs.interval = interval;
        }
        else {
            this.connections.txs = { ws, interval };
        }
        try {
            // subscribe to all subscriptions
            Object.entries(this.txs).forEach(([id, { data }]) => {
                const payload = { subscriptionId: id, method: 'subscribe', data };
                ws.send(JSON.stringify(payload));
            });
            resolve(true);
        }
        catch (err) {
            reject(err);
        }
    }
    onClose(event, resolve, reject) {
        console.warn({ fn: 'onClose', code: event.code, reason: event.reason, type: event.type }, 'websocket closed');
        this.connections.txs?.pingTimeout && clearTimeout(this.connections.txs.pingTimeout);
        this.connections.txs?.interval && clearInterval(this.connections.txs.interval);
        // attempt reconnect logic on non standard exit codes
        if (event.code !== NORMAL_CLOSURE_CODE) {
            if (++this.retryCount >= this.retryAttempts) {
                reject(new Error('failed to reconnect, connection closed'));
                return;
            }
            setTimeout(() => this.initialize(), 500 * this.retryCount ** 2);
        }
        resolve(false);
    }
    onError(event) {
        if (!event.message)
            return;
        console.error({ fn: 'onError', err: event.error, message: event.message, type: event.type }, 'websocket error');
        // send connection errors to all subscription onError handlers
        Object.entries(this.txs).forEach(([id, sub]) => {
            sub.onError?.({ subscriptionId: id, type: 'error', message: event.message });
        });
    }
    onMessage(event) {
        if (event.type !== 'message')
            return;
        // trigger heartbeat keep alive on pong response
        if (event.data === 'pong') {
            this.heartbeat('txs');
            return;
        }
        try {
            const message = JSON.parse(event.data.toString());
            const subscriptionId = this.getDefaultSubscriptionId();
            // narrow type to ErrorResponse if key `type` exists and forward to correct onError handler
            if ('type' in message) {
                return this.txs[message.subscriptionId || subscriptionId]?.onError?.(message);
            }
            // forward the transaction message to the correct onMessage handler
            this.txs[message.subscriptionId || subscriptionId]?.onMessage?.(message);
        }
        catch (err) {
            console.error(err);
        }
    }
    heartbeat(topic) {
        const connection = this.connections[topic];
        if (!connection)
            return;
        connection.pingTimeout && clearTimeout(connection.pingTimeout);
        connection.pingTimeout = setTimeout(() => {
            console.warn({ fn: 'pingTimeout' }, `${topic} heartbeat failed`);
            connection.ws?.close();
        }, this.pingInterval + 5000);
    }
    // for websocket connections that do not return the subscriptionId on the message, use the initial subscriptionId as the default
    getDefaultSubscriptionId() {
        return Object.keys(this.txs)[0];
    }
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
    async subscribeTxs(subscriptionId, data, onMessage, onError) {
        const addresses = [
            ...new Set([...(this.txs[subscriptionId]?.data?.addresses ?? []), ...data.addresses]),
        ];
        // keep track of all subscribed addresses and onMessage/onError handlers associated with each subscriptionId
        this.txs[subscriptionId] = { onMessage, onError, data: { topic: 'txs', addresses } };
        // initialize websocket connection if one does not already exist
        if (!this.connections.txs?.ws) {
            return await this.initialize();
        }
        // subscribe if connection exists and is ready
        if (this.connections.txs.ws.readyState === isomorphic_ws_1.default.OPEN) {
            this.connections.txs.ws.send(JSON.stringify({ subscriptionId, method: 'subscribe', data }));
        }
    }
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
    unsubscribeTxs(subscriptionId, data) {
        if (this.connections.txs?.ws?.readyState !== isomorphic_ws_1.default.OPEN)
            return;
        if (!subscriptionId)
            this.txs = {};
        if (subscriptionId && this.txs[subscriptionId]) {
            // unsubscribe addresses from the current subscribed address set if addresses provided
            if (data?.addresses?.length) {
                this.txs[subscriptionId].data.addresses = this.txs[subscriptionId].data.addresses.filter(address => !data.addresses.includes(address));
            }
            else {
                // delete subscription if no addresses provided
                delete this.txs[subscriptionId];
            }
        }
        const payload = {
            subscriptionId: subscriptionId ?? '',
            method: 'unsubscribe',
            data: { topic: 'txs', addresses: data?.addresses ?? [] },
        };
        this.connections.txs?.ws.send(JSON.stringify(payload));
    }
    /**
     * Close and unsubscribe from any subscriptions
     *
     * - If no topic is provided, all supported topics will be closed and unsubscribed from
     *
     * @param [topic] specifies which topic to close and unsubscribe from
     */
    close(topic) {
        const closeTxs = () => {
            this.unsubscribeTxs();
            this.connections.txs?.ws?.close(NORMAL_CLOSURE_CODE);
        };
        // close all connections if no topic is provided
        if (!topic) {
            closeTxs();
            return;
        }
        switch (topic) {
            case 'txs':
                closeTxs();
                break;
            default:
                console.warn(`topic: ${topic} not supported`);
        }
    }
}
exports.Client = Client;
