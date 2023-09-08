"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const utils_1 = require("./utils");
const main = async () => {
    const data = await (0, utils_1.fetchData)(index_1.coingeckoUrl);
    const output = (0, utils_1.parseData)(data);
    await (0, utils_1.writeFiles)(output);
};
main();
