"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
// To run, install ts-node globally `npm i -g ts-node`
// From the caip package root. Run `ts-node ./src/adapters/coinbase/generate.ts`
const main = async () => {
    const coinbaseCurrencies = await (0, utils_1.getData)();
    const output = (0, utils_1.parseData)(coinbaseCurrencies);
    await (0, utils_1.writeFiles)(output);
};
main();
