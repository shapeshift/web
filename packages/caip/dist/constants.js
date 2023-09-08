"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEE_ASSET_IDS = exports.VALID_ASSET_NAMESPACE = exports.VALID_CHAIN_IDS = exports.ASSET_REFERENCE = exports.ASSET_NAMESPACE = exports.CHAIN_REFERENCE = exports.CHAIN_NAMESPACE = exports.secretChainId = exports.terraChainId = exports.kavaChainId = exports.binanceChainId = exports.thorchainChainId = exports.cosmosChainId = exports.gnosisChainId = exports.polygonChainId = exports.bscChainId = exports.optimismChainId = exports.avalancheChainId = exports.ethChainId = exports.ltcChainId = exports.dogeChainId = exports.bchChainId = exports.btcChainId = exports.secretAssetId = exports.terraAssetId = exports.kavaAssetId = exports.binanceAssetId = exports.thorchainAssetId = exports.cosmosAssetId = exports.foxyAssetId = exports.foxatarAssetId = exports.foxAssetId = exports.foxOnGnosisAssetId = exports.gnosisAssetId = exports.polygonAssetId = exports.bscAssetId = exports.optimismAssetId = exports.avalancheAssetId = exports.ethAssetId = exports.ltcAssetId = exports.dogeAssetId = exports.bchAssetId = exports.btcAssetId = void 0;
exports.btcAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
exports.bchAssetId = 'bip122:000000000000000000651ef99cb9fcbe/slip44:145';
exports.dogeAssetId = 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3';
exports.ltcAssetId = 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2';
exports.ethAssetId = 'eip155:1/slip44:60';
exports.avalancheAssetId = 'eip155:43114/slip44:60';
exports.optimismAssetId = 'eip155:10/slip44:60';
exports.bscAssetId = 'eip155:56/slip44:60';
exports.polygonAssetId = 'eip155:137/slip44:60';
exports.gnosisAssetId = 'eip155:100/slip44:60';
exports.foxOnGnosisAssetId = 'eip155:100/erc20:0x21a42669643f45bc0e086b8fc2ed70c23d67509d';
exports.foxAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
exports.foxatarAssetId = 'eip155:137/erc721:0x2e727c425a11ce6b8819b3004db332c12d2af2a2';
exports.foxyAssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3';
exports.cosmosAssetId = 'cosmos:cosmoshub-4/slip44:118';
exports.thorchainAssetId = 'cosmos:thorchain-mainnet-v1/slip44:931';
exports.binanceAssetId = 'cosmos:binance-chain-tigris/slip44:714';
exports.kavaAssetId = 'cosmos:kava_2222-10/slip44:459';
exports.terraAssetId = 'cosmos:phoenix-1/slip44:330';
exports.secretAssetId = 'cosmos:secret-4/slip44:529';
exports.btcChainId = 'bip122:000000000019d6689c085ae165831e93';
exports.bchChainId = 'bip122:000000000000000000651ef99cb9fcbe';
exports.dogeChainId = 'bip122:00000000001a91e3dace36e2be3bf030';
exports.ltcChainId = 'bip122:12a765e31ffd4059bada1e25190f6e98';
exports.ethChainId = 'eip155:1';
exports.avalancheChainId = 'eip155:43114';
exports.optimismChainId = 'eip155:10';
exports.bscChainId = 'eip155:56';
exports.polygonChainId = 'eip155:137';
exports.gnosisChainId = 'eip155:100';
exports.cosmosChainId = 'cosmos:cosmoshub-4';
exports.thorchainChainId = 'cosmos:thorchain-mainnet-v1';
exports.binanceChainId = 'cosmos:binance-chain-tigris';
exports.kavaChainId = 'cosmos:kava_2222-10';
exports.terraChainId = 'cosmos:phoenix-1';
exports.secretChainId = 'cosmos:secret-4';
exports.CHAIN_NAMESPACE = {
    Evm: 'eip155',
    Utxo: 'bip122',
    CosmosSdk: 'cosmos',
};
exports.CHAIN_REFERENCE = {
    EthereumMainnet: '1',
    EthereumRopsten: '3',
    EthereumRinkeby: '4',
    // EthereumKovan: '42', // currently unsupported by ShapeShift
    // https://github.com/bitcoin/bips/blob/master/bip-0122.mediawiki#definition-of-chain-id
    // chainId uses max length of 32 chars of the genesis block
    BitcoinMainnet: '000000000019d6689c085ae165831e93',
    BitcoinTestnet: '000000000933ea01ad0ee984209779ba',
    BitcoinCashMainnet: '000000000000000000651ef99cb9fcbe',
    DogecoinMainnet: '00000000001a91e3dace36e2be3bf030',
    LitecoinMainnet: '12a765e31ffd4059bada1e25190f6e98',
    CosmosHubMainnet: 'cosmoshub-4',
    CosmosHubVega: 'vega-testnet',
    ThorchainMainnet: 'thorchain-mainnet-v1',
    AvalancheCChain: '43114',
    BinanceMainnet: 'binance-chain-tigris',
    BinanceTestnet: 'binance-chain-ganges',
    KavaMainnet: 'kava_2222-10',
    KavaTestnet: 'kava_2221-16000',
    TerraMainnet: 'phoenix-1',
    TerraTestnet: 'pisco-1',
    SecretMainnet: 'secret-4',
    SecretTestnet: 'pulsar-2',
    OptimismMainnet: '10',
    BnbSmartChainMainnet: '56',
    PolygonMainnet: '137',
    GnosisMainnet: '100', // https://docs.gnosischain.com/tools/wallets/metamask/
};
exports.ASSET_NAMESPACE = {
    cw20: 'cw20',
    cw721: 'cw721',
    erc20: 'erc20',
    erc721: 'erc721',
    erc1155: 'erc1155',
    bep20: 'bep20',
    bep721: 'bep721',
    bep1155: 'bep1155',
    slip44: 'slip44',
    native: 'native',
    ibc: 'ibc',
};
exports.ASSET_REFERENCE = {
    Bitcoin: '0',
    Litecoin: '2',
    Dogecoin: '3',
    Ethereum: '60',
    Cosmos: '118',
    Thorchain: '931',
    BitcoinCash: '145',
    AvalancheC: '60',
    Binance: '714',
    Kava: '459',
    Terra: '330',
    Secret: '529',
    Optimism: '60',
    BnbSmartChain: '60',
    Polygon: '60',
    Gnosis: '60', // evm chain which uses ethereum derivation path as common practice
};
exports.VALID_CHAIN_IDS = Object.freeze({
    [exports.CHAIN_NAMESPACE.Utxo]: [
        exports.CHAIN_REFERENCE.BitcoinMainnet,
        exports.CHAIN_REFERENCE.BitcoinTestnet,
        exports.CHAIN_REFERENCE.BitcoinCashMainnet,
        exports.CHAIN_REFERENCE.DogecoinMainnet,
        exports.CHAIN_REFERENCE.LitecoinMainnet,
    ],
    [exports.CHAIN_NAMESPACE.Evm]: [
        exports.CHAIN_REFERENCE.EthereumMainnet,
        exports.CHAIN_REFERENCE.EthereumRopsten,
        exports.CHAIN_REFERENCE.EthereumRinkeby,
        exports.CHAIN_REFERENCE.AvalancheCChain,
        exports.CHAIN_REFERENCE.OptimismMainnet,
        exports.CHAIN_REFERENCE.BnbSmartChainMainnet,
        exports.CHAIN_REFERENCE.PolygonMainnet,
        exports.CHAIN_REFERENCE.GnosisMainnet,
    ],
    [exports.CHAIN_NAMESPACE.CosmosSdk]: [
        exports.CHAIN_REFERENCE.CosmosHubMainnet,
        exports.CHAIN_REFERENCE.CosmosHubVega,
        exports.CHAIN_REFERENCE.ThorchainMainnet,
        exports.CHAIN_REFERENCE.BinanceMainnet,
        exports.CHAIN_REFERENCE.KavaMainnet,
        exports.CHAIN_REFERENCE.TerraMainnet,
        exports.CHAIN_REFERENCE.SecretMainnet,
    ],
});
exports.VALID_ASSET_NAMESPACE = Object.freeze({
    [exports.CHAIN_NAMESPACE.Utxo]: [exports.ASSET_NAMESPACE.slip44],
    [exports.CHAIN_NAMESPACE.Evm]: [
        exports.ASSET_NAMESPACE.slip44,
        exports.ASSET_NAMESPACE.erc20,
        exports.ASSET_NAMESPACE.erc721,
        exports.ASSET_NAMESPACE.erc1155,
        exports.ASSET_NAMESPACE.bep20,
        exports.ASSET_NAMESPACE.bep721,
        exports.ASSET_NAMESPACE.bep1155,
    ],
    [exports.CHAIN_NAMESPACE.CosmosSdk]: [
        exports.ASSET_NAMESPACE.cw20,
        exports.ASSET_NAMESPACE.cw721,
        exports.ASSET_NAMESPACE.ibc,
        exports.ASSET_NAMESPACE.native,
        exports.ASSET_NAMESPACE.slip44,
    ],
});
// We should prob change this once we add more chains
exports.FEE_ASSET_IDS = [
    exports.ethAssetId,
    exports.btcAssetId,
    exports.bchAssetId,
    exports.cosmosAssetId,
    exports.thorchainAssetId,
    exports.dogeAssetId,
    exports.ltcAssetId,
    exports.avalancheAssetId,
    exports.optimismAssetId,
    exports.bscAssetId,
    exports.polygonAssetId,
    exports.gnosisAssetId,
];
