"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtxoBaseAdapter = exports.utxoChainIds = void 0;
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const types_1 = require("@shapeshiftoss/types");
const multicoin_address_validator_1 = __importDefault(require("multicoin-address-validator"));
const ErrorHandler_1 = require("../error/ErrorHandler");
const types_2 = require("../types");
const utils_1 = require("../utils");
const bignumber_1 = require("../utils/bignumber");
const utxoSelect_1 = require("./utxoSelect");
exports.utxoChainIds = [
    types_1.KnownChainIds.BitcoinMainnet,
    types_1.KnownChainIds.BitcoinCashMainnet,
    types_1.KnownChainIds.DogecoinMainnet,
    types_1.KnownChainIds.LitecoinMainnet,
];
class UtxoBaseAdapter {
    constructor(args) {
        this.accountAddresses = {};
        this.assetId = args.assetId;
        this.chainId = args.chainId;
        this.coinName = args.coinName;
        this.defaultBIP44Params = args.defaultBIP44Params;
        this.defaultUtxoAccountType = args.defaultUtxoAccountType;
        this.parser = args.parser;
        this.providers = args.providers;
        this.supportedAccountTypes = args.supportedAccountTypes;
        this.supportedChainIds = args.supportedChainIds;
        if (!this.supportedChainIds.includes(this.chainId)) {
            throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`);
        }
    }
    assertIsAccountTypeSupported(accountType) {
        if (!this.supportedAccountTypes.includes(accountType))
            throw new Error(`UtxoBaseAdapter: ${accountType} not supported. (supported: ${this.supportedAccountTypes})`);
    }
    getChainId() {
        return this.chainId;
    }
    getSupportedAccountTypes() {
        return this.supportedAccountTypes;
    }
    getCoinName() {
        return this.coinName;
    }
    getBIP44Params({ accountNumber, accountType, index, isChange = false, }) {
        if (accountNumber < 0) {
            throw new Error('accountNumber must be >= 0');
        }
        if (index !== undefined && index < 0) {
            throw new Error('index must be >= 0');
        }
        const purpose = (() => {
            switch (accountType) {
                case types_1.UtxoAccountType.SegwitNative:
                    return 84;
                case types_1.UtxoAccountType.SegwitP2sh:
                    return 49;
                case types_1.UtxoAccountType.P2pkh:
                    return 44;
                default:
                    throw new Error(`not a supported accountType ${accountType}`);
            }
        })();
        return { ...this.defaultBIP44Params, accountNumber, purpose, isChange, index };
    }
    async getAccount(pubkey) {
        try {
            const data = await this.providers.http.getAccount({ pubkey });
            const balance = (0, bignumber_1.bnOrZero)(data.balance).plus((0, bignumber_1.bnOrZero)(data.unconfirmedBalance));
            // cache addresses for getTxHistory to use without needing to make extra requests
            this.accountAddresses[data.pubkey] = data.addresses?.map(address => address.pubkey) ?? [
                data.pubkey,
            ];
            return {
                balance: balance.toString(),
                chain: this.getType(),
                chainId: this.chainId,
                assetId: this.assetId,
                chainSpecific: {
                    addresses: data.addresses,
                    nextChangeAddressIndex: data.nextChangeAddressIndex,
                    nextReceiveAddressIndex: data.nextReceiveAddressIndex,
                },
                pubkey: data.pubkey,
            };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getAddress({ wallet, accountNumber, accountType = this.defaultUtxoAccountType, index, isChange = false, showOnDevice = false, }) {
        try {
            this.assertIsAccountTypeSupported(accountType);
            if (!(0, hdwallet_core_1.supportsBTC)(wallet)) {
                throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`);
            }
            const bip44Params = this.getBIP44Params({ accountNumber, accountType, isChange, index });
            const getNextIndex = async () => {
                const { xpub } = await this.getPublicKey(wallet, accountNumber, accountType);
                const account = await this.getAccount(xpub);
                return bip44Params.isChange
                    ? account.chainSpecific.nextChangeAddressIndex
                    : account.chainSpecific.nextReceiveAddressIndex;
            };
            const maybeNextIndex = bip44Params.index ?? (await getNextIndex());
            const address = await wallet.btcGetAddress({
                addressNList: (0, utils_1.toAddressNList)({ ...bip44Params, index: maybeNextIndex }),
                coin: this.coinName,
                scriptType: utils_1.accountTypeToScriptType[accountType],
                showDisplay: showOnDevice,
            });
            if (!address)
                throw new Error('UtxoBaseAdapter: no address available from wallet');
            return address;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildSendApiTransaction(input) {
        try {
            const { value, to, xpub, accountNumber, sendMax = false, chainSpecific } = input;
            const { from, satoshiPerByte, accountType, opReturnData } = chainSpecific;
            if (!value)
                throw new Error('value is required');
            if (!to)
                throw new Error('to is required');
            if (!satoshiPerByte)
                throw new Error('satoshiPerByte is required');
            this.assertIsAccountTypeSupported(accountType);
            const bip44Params = this.getBIP44Params({ accountNumber, accountType });
            const utxos = await this.providers.http.getUtxos({ pubkey: xpub });
            const coinSelectResult = (0, utxoSelect_1.utxoSelect)({
                utxos,
                from,
                to,
                satoshiPerByte,
                sendMax,
                value,
                opReturnData,
            });
            if (!coinSelectResult?.inputs || !coinSelectResult?.outputs) {
                throw new Error(`UtxoBaseAdapter: coinSelect didn't select coins`);
            }
            const { inputs, outputs } = coinSelectResult;
            const signTxInputs = [];
            for (const input of inputs) {
                if (!input.path)
                    continue;
                const data = await this.providers.http.getTransaction({ txid: input.txid });
                signTxInputs.push({
                    addressNList: (0, hdwallet_core_1.bip32ToAddressNList)(input.path),
                    scriptType: utils_1.accountTypeToScriptType[accountType],
                    amount: String(input.value),
                    vout: input.vout,
                    txid: input.txid,
                    hex: data.hex,
                });
            }
            const account = await this.getAccount(xpub);
            const index = account.chainSpecific.nextChangeAddressIndex;
            const addressNList = (0, utils_1.toAddressNList)({ ...bip44Params, isChange: true, index });
            const signTxOutputs = outputs.map(output => {
                if (output.address) {
                    return {
                        addressType: hdwallet_core_1.BTCOutputAddressType.Spend,
                        amount: String(output.value),
                        address: output.address,
                    };
                }
                return {
                    addressType: hdwallet_core_1.BTCOutputAddressType.Change,
                    amount: String(output.value),
                    addressNList,
                    scriptType: utils_1.accountTypeToOutputScriptType[accountType],
                    isChange: true,
                };
            });
            const txToSign = {
                coin: this.coinName,
                inputs: signTxInputs,
                outputs: signTxOutputs,
                opReturnData,
            };
            return txToSign;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildSendTransaction(input) {
        try {
            const { wallet, accountNumber, chainSpecific } = input;
            if (!(0, hdwallet_core_1.supportsBTC)(wallet)) {
                throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`);
            }
            const { xpub } = await this.getPublicKey(wallet, accountNumber, chainSpecific.accountType);
            const txToSign = await this.buildSendApiTransaction({ ...input, xpub });
            return { txToSign };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getFeeData({ to, value, chainSpecific: { from, pubkey, opReturnData }, sendMax = false, }) {
        if (!to)
            throw new Error('to is required');
        if (!value)
            throw new Error('value is required');
        if (!pubkey)
            throw new Error('pubkey is required');
        const data = await this.providers.http.getNetworkFees();
        if (!(data.fast?.satsPerKiloByte && data.average?.satsPerKiloByte && data.slow?.satsPerKiloByte)) {
            throw new Error('UtxoBaseAdapter: failed to get fee data');
        }
        // TODO: when does this happen and why?
        if (!data.fast?.satsPerKiloByte || data.fast.satsPerKiloByte < 0) {
            data.fast = data.average;
        }
        const utxos = await this.providers.http.getUtxos({ pubkey });
        const utxoSelectInput = { from, to, value, opReturnData, utxos, sendMax };
        // We have to round because coinselect library uses sats per byte which cant be decimals
        const fastPerByte = String(Math.round(data.fast.satsPerKiloByte / 1024));
        const averagePerByte = String(Math.round(data.average.satsPerKiloByte / 1024));
        const slowPerByte = String(Math.round(data.slow.satsPerKiloByte / 1024));
        const { fee: fastFee } = (0, utxoSelect_1.utxoSelect)({ ...utxoSelectInput, satoshiPerByte: fastPerByte });
        const { fee: averageFee } = (0, utxoSelect_1.utxoSelect)({ ...utxoSelectInput, satoshiPerByte: averagePerByte });
        const { fee: slowFee } = (0, utxoSelect_1.utxoSelect)({ ...utxoSelectInput, satoshiPerByte: slowPerByte });
        return {
            fast: { txFee: String(fastFee), chainSpecific: { satoshiPerByte: fastPerByte } },
            average: { txFee: String(averageFee), chainSpecific: { satoshiPerByte: averagePerByte } },
            slow: { txFee: String(slowFee), chainSpecific: { satoshiPerByte: slowPerByte } },
        };
    }
    async signTransaction({ txToSign, wallet }) {
        try {
            if (!(0, hdwallet_core_1.supportsBTC)(wallet)) {
                throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`);
            }
            const signedTx = await wallet.btcSignTx(txToSign);
            if (!signedTx)
                throw new Error('UtxoBaseAdapter: error signing tx');
            return signedTx.serializedTx;
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getTxHistory(input) {
        if (!this.accountAddresses[input.pubkey]) {
            await this.getAccount(input.pubkey);
        }
        const data = await this.providers.http.getTxHistory({
            pubkey: input.pubkey,
            pageSize: input.pageSize,
            cursor: input.cursor,
        });
        const getAddresses = (tx) => {
            const addresses = [];
            tx.vin?.forEach(vin => {
                if (!vin.addresses)
                    return;
                addresses.push(...vin.addresses);
            });
            tx.vout?.forEach(vout => {
                if (!vout.addresses)
                    return;
                addresses.push(...vout.addresses);
            });
            return [...new Set(addresses)];
        };
        const txs = await Promise.all((data.txs ?? []).map(tx => {
            const addresses = getAddresses(tx).filter(addr => this.accountAddresses[input.pubkey].includes(addr));
            return Promise.all(addresses.map(async (addr) => {
                const parsedTx = await this.parser.parse(tx, addr);
                return {
                    address: addr,
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
                    })),
                };
            }));
        }));
        return {
            cursor: data.cursor ?? '',
            pubkey: input.pubkey,
            transactions: txs.flat(),
        };
    }
    broadcastTransaction(hex) {
        return this.providers.http.sendTx({ sendTxBody: { hex } });
    }
    async subscribeTxs(input, onMessage, onError) {
        const { wallet, accountNumber, accountType = this.defaultUtxoAccountType } = input;
        const bip44Params = this.getBIP44Params({ accountNumber, accountType });
        const { xpub } = await this.getPublicKey(wallet, accountNumber, accountType);
        const account = await this.getAccount(xpub);
        const addresses = (account.chainSpecific.addresses ?? []).map(address => address.pubkey);
        const subscriptionId = `${(0, utils_1.toRootDerivationPath)(bip44Params)}/${accountType}`;
        await this.providers.ws.subscribeTxs(subscriptionId, { topic: 'txs', addresses }, async (msg) => {
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
                })),
                txid: tx.txid,
            });
        }, err => onError({ message: err.message }));
    }
    unsubscribeTxs(input) {
        if (!input)
            return this.providers.ws.unsubscribeTxs();
        const { accountNumber, accountType = this.defaultUtxoAccountType } = input;
        const bip44Params = this.getBIP44Params({ accountNumber, accountType });
        const subscriptionId = `${(0, utils_1.toRootDerivationPath)(bip44Params)}/${accountType}`;
        this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] });
    }
    closeTxs() {
        this.providers.ws.close('txs');
    }
    // eslint-disable-next-line require-await
    async validateAddress(address) {
        const chainLabel = (0, utils_1.chainIdToChainLabel)(this.chainId);
        const isValidAddress = multicoin_address_validator_1.default.validate(address, chainLabel);
        if (isValidAddress)
            return { valid: true, result: types_2.ValidAddressResultType.Valid };
        return { valid: false, result: types_2.ValidAddressResultType.Invalid };
    }
    async getPublicKey(wallet, accountNumber, accountType) {
        this.assertIsAccountTypeSupported(accountType);
        const bip44Params = this.getBIP44Params({ accountNumber, accountType });
        const path = (0, utils_1.toRootDerivationPath)(bip44Params);
        const publicKeys = await wallet.getPublicKeys([
            {
                coin: this.coinName,
                addressNList: (0, hdwallet_core_1.bip32ToAddressNList)(path),
                curve: 'secp256k1',
                scriptType: utils_1.accountTypeToScriptType[accountType],
            },
        ]);
        if (!publicKeys?.[0])
            throw new Error("couldn't get public key");
        if (accountType) {
            return { xpub: (0, utils_1.convertXpubVersion)(publicKeys[0].xpub, accountType) };
        }
        return publicKeys[0];
    }
}
exports.UtxoBaseAdapter = UtxoBaseAdapter;
