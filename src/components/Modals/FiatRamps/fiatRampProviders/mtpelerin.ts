import { adapters } from "@shapeshiftoss/caip";
import { FiatRampAction, FiatRampAsset } from "../FiatRampsCommon";


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
            disabled: false,
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
    buyOrSell: FiatRampAction, 
    destinationCurrency: string,
    address: string
): string {
    let operation = "";
    if(buyOrSell === FiatRampAction.Buy) {
        operation = "buy";
    } else if(buyOrSell === FiatRampAction.Sell) {
        operation = "sell";
    }
    return `https://${operation}.mtpelerin.com/?type=direct-link&bdc=${destinationCurrency}&addr=${address}&tab=${operation}&ssc=${destinationCurrency}`;
}
