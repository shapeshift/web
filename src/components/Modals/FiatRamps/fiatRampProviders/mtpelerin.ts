import { adapters } from "@shapeshiftoss/caip";
import { FiatRampAsset } from "../FiatRampsCommon";


import axios from "axios";

const assetList = require("./mtpelerinAssets.json");

export async function getMtPelerinAssets()  {
    const assets = assetList;
    console.log(assets);

    const fiatRampAssets:FiatRampAsset[] = [];

    Object.keys(assets).forEach(key => {
        const asset = assets[key];
        const fiatRampAsset:FiatRampAsset = {
            assetId: asset.symbol,
            name: asset.symbol,
            symbol: asset.symbol,
            disabled: false
        }
        fiatRampAssets.push(fiatRampAsset);
    })


    console.log(fiatRampAssets)
    return fiatRampAssets;
}
