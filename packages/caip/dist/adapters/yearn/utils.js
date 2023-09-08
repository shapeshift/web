"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseData = exports.parseEthData = exports.fetchData = exports.writeFiles = void 0;
const sdk_1 = require("@yfi/sdk");
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const toLower_1 = __importDefault(require("lodash/toLower"));
const uniqBy_1 = __importDefault(require("lodash/uniqBy"));
const assetId_1 = require("../../assetId/assetId");
const chainId_1 = require("../../chainId/chainId");
const constants_1 = require("../../constants");
const network = 1; // 1 for mainnet
const provider = new ethers_1.ethers.providers.JsonRpcBatchProvider(process.env.REACT_APP_ETHEREUM_NODE_URL);
const yearnSdk = new sdk_1.Yearn(network, { provider });
const writeFiles = async (data) => {
    const path = './src/adapters/yearn/generated/';
    const file = '/adapter.json';
    const writeFile = async ([k, v]) => await fs_1.default.promises.writeFile(`${path}${k}${file}`.replace(':', '_'), JSON.stringify(v));
    await Promise.all(Object.entries(data).map(writeFile));
    console.info('Generated Yearn AssetId adapter data.');
};
exports.writeFiles = writeFiles;
const fetchData = async () => {
    const [vaults, zapperTokens, underlyingVaultTokens] = await Promise.all([
        yearnSdk.vaults.get(),
        yearnSdk.tokens.supported(),
        yearnSdk.vaults.tokens(),
    ]);
    const tokens = [...vaults, ...zapperTokens, ...underlyingVaultTokens];
    return (0, uniqBy_1.default)(tokens, 'address');
};
exports.fetchData = fetchData;
const parseEthData = (data) => {
    const assetNamespace = 'erc20';
    const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
    const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
    return data.reduce((acc, datum) => {
        const { address } = datum;
        const id = address;
        const assetReference = (0, toLower_1.default)(address);
        const assetId = (0, assetId_1.toAssetId)({
            chainNamespace,
            chainReference,
            assetNamespace,
            assetReference,
        });
        acc[assetId] = id;
        return acc;
    }, {});
};
exports.parseEthData = parseEthData;
const parseData = (d) => {
    const ethMainnet = (0, chainId_1.toChainId)({
        chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
        chainReference: constants_1.CHAIN_REFERENCE.EthereumMainnet,
    });
    return { [ethMainnet]: (0, exports.parseEthData)(d) };
};
exports.parseData = parseData;
