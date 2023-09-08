"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@shapeshiftoss/types");
const utxoUtils_1 = require("./utxoUtils");
const xpub = 'xpub6GPVbpBHJMUEK8BzF4ntoP1mdtpMgXJhNSfRQew9vMLLzHB9JyRfj5C5wmqyoRfRQiRL7V7GJkqKEnDEXn1cTBnodPyBW69ao498pg6stm6';
const ypub = 'ypub6bDkuUrCT31iARP75RaX1U7Gorxod9JCHZBeC3q3JMiE3NzNZdbEM8rDxyoZoLKLpMY8rxhpmRBs84poFURdFRUQVjfc5zy54nCnDGGhnDa';
const zpub = 'zpub6v42D9X7biZC1iaDunN9DZCmyq7FZmHhCfhrySivgN676UobpHknyCWMzBm9oEyGDzewcSJPE5YR1MSMyAqe3fA1N5N2funZLWGRbsRjA1s';
describe('utxoUtils', () => {
    describe('convertXpubVersion', () => {
        it.each([
            [xpub, types_1.UtxoAccountType.P2pkh, xpub],
            [xpub, types_1.UtxoAccountType.SegwitP2sh, ypub],
            [xpub, types_1.UtxoAccountType.SegwitNative, zpub],
            [ypub, types_1.UtxoAccountType.P2pkh, xpub],
            [ypub, types_1.UtxoAccountType.SegwitP2sh, ypub],
            [ypub, types_1.UtxoAccountType.SegwitNative, zpub],
            [zpub, types_1.UtxoAccountType.P2pkh, xpub],
            [zpub, types_1.UtxoAccountType.SegwitP2sh, ypub],
            [zpub, types_1.UtxoAccountType.SegwitNative, zpub],
        ])('should convert %s to %s', (input, type, expected) => {
            expect((0, utxoUtils_1.convertXpubVersion)(input, type)).toBe(expected);
        });
    });
});
