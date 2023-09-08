"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFiles = exports.getData = exports.parseData = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const toLower_1 = __importDefault(require("lodash/toLower"));
function coinbaseCurrencyToAssetId(currency) {
    if (currency.id === 'BTC')
        return 'bip122:000000000019d6689c085ae165831e93/slip44:0';
    if (currency.id === 'ATOM')
        return 'cosmos:cosmoshub-4/slip44:118';
    if (currency.id === 'ETH')
        return 'eip155:1/slip44:60';
    if (currency.default_network === 'ethereum') {
        const addressQuery = currency.details.crypto_address_link?.split('token/')[1];
        const address = addressQuery?.split('?a')[0];
        return `eip155:1/erc20:${(0, toLower_1.default)(address)}`;
    }
    console.info(`Could not create assetId from coinbase asset ${currency.id}`);
    return null;
}
function parseData(data) {
    return data.reduce((acc, current) => {
        const assetId = coinbaseCurrencyToAssetId(current);
        if (!assetId)
            return acc;
        acc[assetId] = current.id;
        return acc;
    }, {});
}
exports.parseData = parseData;
async function getData() {
    try {
        const { data } = await axios_1.default.get('https://api.pro.coinbase.com/currencies');
        return data;
    }
    catch (err) {
        console.error('Get supported coins (coinbase-pay) failed');
        return [];
    }
}
exports.getData = getData;
const writeFile = async (data) => {
    const path = './src/adapters/coinbase/generated/';
    const file = 'adapter.json';
    await fs_1.default.promises.writeFile(`${path}${file}`, JSON.stringify(data, null, 2));
};
const writeFiles = async (data) => {
    await writeFile(data);
    console.info('Generated Coinbase AssetId adapter data.');
};
exports.writeFiles = writeFiles;
