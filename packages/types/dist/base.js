"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtxoAccountType = exports.WithdrawType = exports.KnownChainIds = void 0;
var KnownChainIds;
(function (KnownChainIds) {
    KnownChainIds["EthereumMainnet"] = "eip155:1";
    KnownChainIds["AvalancheMainnet"] = "eip155:43114";
    KnownChainIds["OptimismMainnet"] = "eip155:10";
    KnownChainIds["BnbSmartChainMainnet"] = "eip155:56";
    KnownChainIds["PolygonMainnet"] = "eip155:137";
    KnownChainIds["GnosisMainnet"] = "eip155:100";
    KnownChainIds["BitcoinMainnet"] = "bip122:000000000019d6689c085ae165831e93";
    KnownChainIds["BitcoinCashMainnet"] = "bip122:000000000000000000651ef99cb9fcbe";
    KnownChainIds["DogecoinMainnet"] = "bip122:00000000001a91e3dace36e2be3bf030";
    KnownChainIds["LitecoinMainnet"] = "bip122:12a765e31ffd4059bada1e25190f6e98";
    KnownChainIds["CosmosMainnet"] = "cosmos:cosmoshub-4";
    KnownChainIds["ThorchainMainnet"] = "cosmos:thorchain-mainnet-v1";
})(KnownChainIds || (exports.KnownChainIds = KnownChainIds = {}));
var WithdrawType;
(function (WithdrawType) {
    WithdrawType[WithdrawType["DELAYED"] = 0] = "DELAYED";
    WithdrawType[WithdrawType["INSTANT"] = 1] = "INSTANT";
})(WithdrawType || (exports.WithdrawType = WithdrawType = {}));
var UtxoAccountType;
(function (UtxoAccountType) {
    UtxoAccountType["SegwitNative"] = "SegwitNative";
    UtxoAccountType["SegwitP2sh"] = "SegwitP2sh";
    UtxoAccountType["P2pkh"] = "P2pkh";
})(UtxoAccountType || (exports.UtxoAccountType = UtxoAccountType = {}));
