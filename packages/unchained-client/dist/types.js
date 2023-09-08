"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferType = exports.TradeType = exports.TxStatus = exports.Dex = void 0;
// these are user facing values, and should be rendered as such
var Dex;
(function (Dex) {
    Dex["Thor"] = "THORChain";
    Dex["Zrx"] = "0x";
    Dex["CowSwap"] = "CoW Swap";
})(Dex || (exports.Dex = Dex = {}));
// these are user facing values, and should be rendered as such
var TxStatus;
(function (TxStatus) {
    TxStatus["Confirmed"] = "Confirmed";
    TxStatus["Pending"] = "Pending";
    TxStatus["Failed"] = "Failed";
    TxStatus["Unknown"] = "Unknown";
})(TxStatus || (exports.TxStatus = TxStatus = {}));
// these are user facing values, and should be rendered as such
var TradeType;
(function (TradeType) {
    TradeType["Trade"] = "Trade";
    TradeType["Refund"] = "Refund";
})(TradeType || (exports.TradeType = TradeType = {}));
// these are user facing values, and should be rendered as such
var TransferType;
(function (TransferType) {
    TransferType["Send"] = "Send";
    TransferType["Receive"] = "Receive";
    TransferType["Contract"] = "Contract";
})(TransferType || (exports.TransferType = TransferType = {}));
