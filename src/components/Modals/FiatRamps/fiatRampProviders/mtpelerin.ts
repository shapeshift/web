import { adapters } from "@shapeshiftoss/caip";
import { FiatRampAsset } from "../FiatRampsCommon";


import axios from "axios";

const assetList = require("./mtpelerinAssets.json");

export async function getMtPelerinAssets()  {
    const assets = assetList;
    const fiatRampAssets:FiatRampAsset[] = [];
    Object.keys(assets).forEach(key => {
        const asset = assets[key];
        const fiatRampAsset:FiatRampAsset = {
            assetId: adapters.MtPelerinTickerToAssetId(asset.symbol),
            name: `${asset.symbol}`,
            symbol: asset.symbol,
        }
        for(const fiatRampAssetKey in fiatRampAssets) {
            if(fiatRampAssets[fiatRampAssetKey].assetId === fiatRampAsset.assetId) {
                return;
            }
        }
        fiatRampAssets.push(fiatRampAsset);
    })
    return fiatRampAssets;
}

export function getMtPelerinLink(
    buyOrSell: string, 
    destinationCurrency: string,
    address: string
): string {
    return `https://${buyOrSell}.mtpelerin.com/?type=direct-link&bdr=${destinationCurrency}&addr=${address}`;
}
