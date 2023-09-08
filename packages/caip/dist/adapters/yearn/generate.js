"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const main = async () => {
    const data = await (0, utils_1.fetchData)();
    const output = (0, utils_1.parseData)(data);
    await (0, utils_1.writeFiles)(output);
};
main();
