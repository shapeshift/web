"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvmBaseAdapter = exports.isEvmChainId = exports.evmChainIds = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const types_1 = require("@shapeshiftoss/types");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const ethers_1 = require("ethers");
const web3_utils_1 = require("web3-utils");
const ErrorHandler_1 = require("../error/ErrorHandler");
const types_2 = require("../types");
const utils_1 = require("../utils");
const bignumber_1 = require("../utils/bignumber");
const utils_2 = require("./utils");
exports.evmChainIds = [
    types_1.KnownChainIds.EthereumMainnet,
    types_1.KnownChainIds.AvalancheMainnet,
    types_1.KnownChainIds.OptimismMainnet,
    types_1.KnownChainIds.BnbSmartChainMainnet,
    types_1.KnownChainIds.PolygonMainnet,
    types_1.KnownChainIds.GnosisMainnet,
];
const isEvmChainId = (maybeEvmChainId) => {
    return exports.evmChainIds.includes(maybeEvmChainId);
};
exports.isEvmChainId = isEvmChainId;
class EvmBaseAdapter {
    constructor(args) {
        this.assetId = args.assetId;
        this.chainId = args.chainId;
        this.defaultBIP44Params = args.defaultBIP44Params;
        this.parser = args.parser;
        this.providers = args.providers;
        this.rpcUrl = args.rpcUrl;
        this.supportedChainIds = args.supportedChainIds;
        if (!this.supportedChainIds.includes(this.chainId)) {
            throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`);
        }
    }
    getChainId() {
        return this.chainId;
    }
    getRpcUrl() {
        return this.rpcUrl;
    }
    getBIP44Params({ accountNumber }) {
        if (accountNumber < 0) {
            throw new Error('accountNumber must be >= 0');
        }
        return { ...this.defaultBIP44Params, accountNumber };
    }
    supportsChain(wallet, chainReference) {
        switch (chainReference ?? Number((0, caip_1.fromChainId)(this.chainId).chainReference)) {
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.AvalancheMainnet).chainReference):
                return (0, hdwallet_core_1.supportsAvalanche)(wallet);
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.BnbSmartChainMainnet).chainReference):
                return (0, hdwallet_core_1.supportsBSC)(wallet);
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.EthereumMainnet).chainReference):
                return (0, hdwallet_core_1.supportsETH)(wallet);
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.OptimismMainnet).chainReference):
                return (0, hdwallet_core_1.supportsOptimism)(wallet);
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.PolygonMainnet).chainReference):
                return (0, hdwallet_core_1.supportsPolygon)(wallet);
            case Number((0, caip_1.fromChainId)(types_1.KnownChainIds.GnosisMainnet).chainReference):
                return (0, hdwallet_core_1.supportsGnosis)(wallet);
            default:
                return false;
        }
    }
    async assertSwitchChain(wallet) {
        if (!wallet.ethGetChainId)
            return;
        const walletChainReference = await wallet.ethGetChainId();
        const adapterChainReference = Number((0, caip_1.fromChainId)(this.chainId).chainReference);
        // switch chain not needed if wallet and adapter chains match
        if (walletChainReference === adapterChainReference)
            return;
        // error if wallet and adapter chains don't match, but switch chain isn't supported by the wallet
        if (!wallet.ethSwitchChain) {
            throw new Error(`wallet does not support switching chains: wallet network (${walletChainReference}) and adapter network (${adapterChainReference}) do not match.`);
        }
        // TODO: use asset-service baseAssets.ts after lib is moved into web (circular dependency)
        const targetNetwork = {
            [types_1.KnownChainIds.AvalancheMainnet]: {
                name: 'Avalanche',
                symbol: 'AVAX',
                explorer: 'https://snowtrace.io',
            },
            [types_1.KnownChainIds.BnbSmartChainMainnet]: {
                name: 'BNB',
                symbol: 'BNB',
                explorer: 'https://bscscan.com',
            },
            [types_1.KnownChainIds.PolygonMainnet]: {
                name: 'Polygon',
                symbol: 'MATIC',
                explorer: 'https://polygonscan.com/',
            },
            [types_1.KnownChainIds.GnosisMainnet]: {
                name: 'xDAI',
                symbol: 'xDAI',
                explorer: 'https://gnosisscan.io/',
            },
            [types_1.KnownChainIds.EthereumMainnet]: {
                name: 'Ethereum',
                symbol: 'ETH',
                explorer: 'https://etherscan.io',
            },
            [types_1.KnownChainIds.OptimismMainnet]: {
                name: 'Ethereum',
                symbol: 'ETH',
                explorer: 'https://optimistic.etherscan.io',
            },
        }[this.chainId];
        await wallet.ethSwitchChain({
            chainId: ethers_1.utils.hexValue(adapterChainReference),
            chainName: this.getDisplayName(),
            nativeCurrency: {
                name: targetNetwork.name,
                symbol: targetNetwork.symbol,
                decimals: 18,
            },
            rpcUrls: [this.getRpcUrl()],
            blockExplorerUrls: [targetNetwork.explorer],
        });
    }
    async buildSendApiTransaction(input) {
        try {
            const { to, from, value, accountNumber, chainSpecific, sendMax = false, customNonce } = input;
            const { data, contractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = chainSpecific;
            if (!to)
                throw new Error(`${this.getName()}ChainAdapter: to is required`);
            if (!value)
                throw new Error(`${this.getName()}ChainAdapter: value is required`);
            if (!gasLimit)
                throw new Error(`${this.getName()}ChainAdapter: gasLimit is required`);
            const account = await this.getAccount(from);
            const isTokenSend = !!contractAddress;
            const _value = (() => {
                if (!sendMax)
                    return value;
                if (isTokenSend) {
                    const tokenBalance = account.chainSpecific.tokens?.find(token => {
                        return (0, caip_1.fromAssetId)(token.assetId).assetReference === contractAddress.toLowerCase();
                    })?.balance;
                    if (!tokenBalance)
                        throw new Error('no balance');
                    return tokenBalance;
                }
                if ((0, bignumber_1.bnOrZero)(account.balance).isZero())
                    throw new Error('no balance');
                const fee = (0, bignumber_1.bnOrZero)(maxFeePerGas ?? gasPrice).times((0, bignumber_1.bnOrZero)(gasLimit));
                return (0, bignumber_1.bnOrZero)(account.balance).minus(fee).toString();
            })();
            const fees = (() => {
                if (maxFeePerGas && maxPriorityFeePerGas) {
                    return {
                        maxFeePerGas: (0, web3_utils_1.numberToHex)(maxFeePerGas),
                        maxPriorityFeePerGas: (0, web3_utils_1.numberToHex)(maxPriorityFeePerGas),
                    };
                }
                return { gasPrice: (0, web3_utils_1.numberToHex)(gasPrice) };
            })();
            const nonce = customNonce !== undefined
                ? (0, web3_utils_1.numberToHex)(customNonce)
                : (0, web3_utils_1.numberToHex)(account.chainSpecific.nonce);
            const txToSign = {
                addressNList: (0, utils_1.toAddressNList)(this.getBIP44Params({ accountNumber })),
                value: (0, web3_utils_1.numberToHex)(isTokenSend ? '0' : _value),
                to: isTokenSend ? contractAddress : to,
                chainId: Number((0, caip_1.fromChainId)(this.chainId).chainReference),
                data: data || (await (0, utils_2.getErc20Data)(to, _value, contractAddress)),
                nonce,
                gasLimit: (0, web3_utils_1.numberToHex)(gasLimit),
                ...fees,
            };
            return txToSign;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildSendTransaction(input) {
        try {
            if (!this.supportsChain(input.wallet)) {
                throw new Error(`wallet does not support ${this.getDisplayName()}`);
            }
            await this.assertSwitchChain(input.wallet);
            const from = await this.getAddress(input);
            const txToSign = await this.buildSendApiTransaction({ ...input, from });
            return { txToSign };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildEstimateGasRequest({ to, value, chainSpecific: { contractAddress, from, data }, sendMax = false, }) {
        const isTokenSend = !!contractAddress;
        // get the exact send max value for an erc20 send to ensure we have the correct input data when estimating fees
        if (sendMax && isTokenSend) {
            const account = await this.getAccount(from);
            const tokenBalance = account.chainSpecific.tokens?.find(token => {
                const { assetReference } = (0, caip_1.fromAssetId)(token.assetId);
                return assetReference === contractAddress.toLowerCase();
            })?.balance;
            if (!tokenBalance)
                throw new Error('no balance');
            value = tokenBalance;
        }
        return {
            from,
            to: isTokenSend ? contractAddress : to,
            value: isTokenSend ? '0' : value,
            data: data || (await (0, utils_2.getErc20Data)(to, value, contractAddress)),
        };
    }
    async getAccount(pubkey) {
        try {
            const data = await this.providers.http.getAccount({ pubkey });
            const balance = (0, bignumber_1.bnOrZero)(data.balance).plus((0, bignumber_1.bnOrZero)(data.unconfirmedBalance));
            return {
                balance: balance.toString(),
                chainId: this.chainId,
                assetId: this.assetId,
                chain: this.getType(),
                chainSpecific: {
                    nonce: data.nonce,
                    tokens: data.tokens.map(token => ({
                        balance: token.balance,
                        assetId: (0, caip_1.toAssetId)({
                            chainId: this.chainId,
                            assetNamespace: (0, utils_1.getAssetNamespace)(token.type),
                            assetReference: token.id ? `${token.contract}/${token.id}` : token.contract,
                        }),
                    })),
                },
                pubkey: data.pubkey,
            };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getTxHistory(input) {
        const data = await this.providers.http.getTxHistory({
            pubkey: input.pubkey,
            pageSize: input.pageSize,
            cursor: input.cursor,
        });
        const txs = await Promise.all(data.txs.map(async (tx) => {
            const parsedTx = await this.parser.parse(tx, input.pubkey);
            return {
                address: input.pubkey,
                blockHash: parsedTx.blockHash,
                blockHeight: parsedTx.blockHeight,
                blockTime: parsedTx.blockTime,
                chainId: parsedTx.chainId,
                chain: this.getType(),
                confirmations: parsedTx.confirmations,
                txid: parsedTx.txid,
                fee: parsedTx.fee,
                status: parsedTx.status,
                trade: parsedTx.trade,
                transfers: parsedTx.transfers.map(transfer => ({
                    assetId: transfer.assetId,
                    from: transfer.from,
                    to: transfer.to,
                    type: transfer.type,
                    value: transfer.totalValue,
                    id: transfer.id,
                    token: transfer.token,
                })),
                data: parsedTx.data,
            };
        }));
        return {
            cursor: data.cursor ?? '',
            pubkey: input.pubkey,
            transactions: txs,
        };
    }
    async signTransaction(signTxInput) {
        try {
            const { txToSign, wallet } = signTxInput;
            if (!this.supportsChain(wallet, txToSign.chainId))
                throw new Error(`wallet does not support chain reference: ${txToSign.chainId}`);
            const signedTx = await wallet.ethSignTx(txToSign);
            if (!signedTx)
                throw new Error('Error signing tx');
            return signedTx.serialized;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async signAndBroadcastTransaction(signTxInput) {
        try {
            const { txToSign, wallet } = signTxInput;
            if (!this.supportsChain(wallet, txToSign.chainId))
                throw new Error(`wallet does not support chain reference: ${txToSign.chainId}`);
            await this.assertSwitchChain(wallet);
            const txHash = await wallet.ethSendTx?.(txToSign);
            if (!txHash)
                throw new Error('Error signing & broadcasting tx');
            return txHash.hash;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    broadcastTransaction(hex) {
        return this.providers.http.sendTx({ sendTxBody: { hex } });
    }
    async signMessage(signMessageInput) {
        try {
            const { messageToSign, wallet } = signMessageInput;
            if (!this.supportsChain(wallet))
                throw new Error(`wallet does not support ${this.getDisplayName()}`);
            const signedMessage = await wallet.ethSignMessage(messageToSign);
            if (!signedMessage)
                throw new Error('EvmBaseAdapter: error signing message');
            return signedMessage.signature;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async signTypedData(input) {
        try {
            const { typedDataToSign, wallet } = input;
            if (!this.supportsChain(wallet)) {
                throw new Error(`wallet does not support ${this.getDisplayName()}`);
            }
            if (!wallet.ethSignTypedData) {
                throw new Error('wallet does not support signing typed data');
            }
            const result = await wallet.ethSignTypedData(typedDataToSign);
            if (!result)
                throw new Error('EvmBaseAdapter: error signing typed data');
            return result.signature;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getAddress(input) {
        const { accountNumber, wallet, showOnDevice = false } = input;
        const bip44Params = this.getBIP44Params({ accountNumber });
        const address = await wallet.ethGetAddress({
            addressNList: (0, utils_1.toAddressNList)(bip44Params),
            showDisplay: showOnDevice,
        });
        if (!address)
            throw new Error('EvmBaseAdapter: no address available from wallet');
        return address;
    }
    // eslint-disable-next-line require-await
    async validateAddress(address) {
        const isValidAddress = ethers_1.utils.isAddress(address);
        if (isValidAddress)
            return { valid: true, result: types_2.ValidAddressResultType.Valid };
        return { valid: false, result: types_2.ValidAddressResultType.Invalid };
    }
    async subscribeTxs(input, onMessage, onError) {
        const { accountNumber, wallet } = input;
        const address = await this.getAddress({ accountNumber, wallet });
        const bip44Params = this.getBIP44Params({ accountNumber });
        const subscriptionId = (0, utils_1.toRootDerivationPath)(bip44Params);
        await this.providers.ws.subscribeTxs(subscriptionId, { topic: 'txs', addresses: [address] }, async (msg) => {
            const tx = await this.parser.parse(msg.data, msg.address);
            onMessage({
                address: tx.address,
                blockHash: tx.blockHash,
                blockHeight: tx.blockHeight,
                blockTime: tx.blockTime,
                chainId: tx.chainId,
                confirmations: tx.confirmations,
                fee: tx.fee,
                status: tx.status,
                trade: tx.trade,
                transfers: tx.transfers.map(transfer => ({
                    assetId: transfer.assetId,
                    from: transfer.from,
                    to: transfer.to,
                    type: transfer.type,
                    value: transfer.totalValue,
                    id: transfer.id,
                    token: transfer.token,
                })),
                txid: tx.txid,
                data: tx.data,
            });
        }, err => onError({ message: err.message }));
    }
    unsubscribeTxs(input) {
        if (!input)
            return this.providers.ws.unsubscribeTxs();
        const { accountNumber } = input;
        const bip44Params = this.getBIP44Params({ accountNumber });
        const subscriptionId = (0, utils_1.toRootDerivationPath)(bip44Params);
        this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] });
    }
    closeTxs() {
        this.providers.ws.close('txs');
    }
    async buildCustomApiTx(input) {
        try {
            const { to, from, accountNumber, data, value } = input;
            const { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = input;
            const account = await this.getAccount(from);
            const fees = maxFeePerGas && maxPriorityFeePerGas
                ? {
                    maxFeePerGas: (0, web3_utils_1.numberToHex)(maxFeePerGas),
                    maxPriorityFeePerGas: (0, web3_utils_1.numberToHex)(maxPriorityFeePerGas),
                }
                : { gasPrice: (0, web3_utils_1.numberToHex)(gasPrice ?? '0') };
            const bip44Params = this.getBIP44Params({ accountNumber });
            const txToSign = {
                addressNList: (0, utils_1.toAddressNList)(bip44Params),
                value: (0, web3_utils_1.numberToHex)(value),
                to,
                chainId: Number((0, caip_1.fromChainId)(this.chainId).chainReference),
                data,
                nonce: (0, web3_utils_1.numberToHex)(account.chainSpecific.nonce),
                gasLimit: (0, web3_utils_1.numberToHex)(gasLimit),
                ...fees,
            };
            return txToSign;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildCustomTx(input) {
        try {
            const { wallet, accountNumber } = input;
            if (!this.supportsChain(wallet)) {
                throw new Error(`wallet does not support ${this.getDisplayName()}`);
            }
            await this.assertSwitchChain(wallet);
            const from = await this.getAddress({ accountNumber, wallet });
            const txToSign = await this.buildCustomApiTx({ ...input, from });
            return { txToSign };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getGasFeeData() {
        const { fast, average, slow } = await this.providers.http.getGasFees();
        return { fast, average, slow };
    }
    async getFeeData(input) {
        const req = await this.buildEstimateGasRequest(input);
        const { gasLimit } = await this.providers.http.estimateGas(req);
        const { fast, average, slow } = await this.getGasFeeData();
        return {
            fast: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(fast.gasPrice, fast.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...fast },
            },
            average: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(average.gasPrice, average.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...average },
            },
            slow: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(slow.gasPrice, slow.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...slow },
            },
        };
    }
    get httpProvider() {
        return this.providers.http;
    }
    get wsProvider() {
        return this.providers.ws;
    }
}
exports.EvmBaseAdapter = EvmBaseAdapter;
