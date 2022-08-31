import { adapters, AssetId } from "@shapeshiftoss/caip";
import axios from "axios";
import { getConfig } from "config";
import { groupBy, head, uniqBy } from "lodash";
import { logger } from "lib/logger";

import { FiatRampAction, FiatRampAsset } from "../FiatRampsCommon";

const moduleLogger = logger.child({
  namespace: ["Modals", "FiatRamps", "fiatRampProviders", "OnRamper"],
});

// Non-exhaustive required types definition. Full reference: https://github.com/onramper/widget/blob/master/package/src/ApiContext/api/types/gateways.ts
interface OnRamperGatewaysResponse {
  gateways: IGatewayItem[];
  icons: TokenIconMap;
}

type TokenIconMap = {
  [key: string]: IconGatewaysResponse;
};

interface Currency {
  code: string;
  id: string;
  network?: string;
  displayName?: string;
}

interface IconGatewaysResponse {
  name: string;
  icon: string;
  symbol?: string;
}

interface IGatewayItem {
  identifier: string;
  cryptoCurrencies: Currency[];
}

export const getOnRamperAssets = async (): Promise<FiatRampAsset[]> => {
  const data = await (async () => {
    try {
      const baseUrl = getConfig().REACT_APP_ONRAMPER_API_URL;
      const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY;
      const { data } = await axios.get<OnRamperGatewaysResponse>(
        `${baseUrl}gateways?includeIcons=true`,
        {
          headers: {
            Authorization: `Basic ${apiKey}`,
          },
        }
      );

      return data;
    } catch (e) {
      moduleLogger.error(e, "Failed to fetch assets");
    }
  })();

  if (!data) return [];

  const fiatRampAssets = convertOnRamperDataToFiatRampAsset(data);
  return fiatRampAssets;
};

const convertOnRamperDataToFiatRampAsset = (
  response: OnRamperGatewaysResponse
): FiatRampAsset[] => {
  // We only need Transak coin definitions, they have the cleanest naming scheme out of all available providers
  const groupedByGateway = groupBy(response.gateways, "identifier");
  const initialCoins = head(groupedByGateway["Transak"])
    ?.cryptoCurrencies.map((currency) => {
      console.log(currency);
      return toFiatRampAsset(currency, response.icons);
    })
    .filter((p) => p !== undefined) as FiatRampAsset[];

  const uniqueCoins = uniqBy(initialCoins, "assetId");
  return uniqueCoins;
};

function toFiatRampAsset(
  currency: Currency,
  icons: TokenIconMap
): FiatRampAsset | undefined {
  const assetId = adapters.onRamperTickerToAssetId(currency.code);
  if (assetId !== undefined) {
    return {
      name: currency.displayName || "",
      assetId,
      symbol: currency.code,
      imageUrl: icons[currency.code].icon,
      fiatRampCoinId: currency.id
    };
  }
  return undefined;
}

export const createOnRamperUrl = (
  action: FiatRampAction,
  assetId: AssetId,
  address: string
): string => {
  const onRamperSymbol = adapters.assetIdToOnRamperTicker(assetId);
  // get the supported assets for this chain based on assetId
  // and filter available tokens for this trade

  console.log(onRamperSymbol);

  if (!onRamperSymbol) throw new Error("Asset not supported by OnRamper");

  const baseUrl = getConfig().REACT_APP_ONRAMPER_WIDGET_URL;
  const apiKey = getConfig().REACT_APP_ONRAMPER_API_KEY;

  const params = new URLSearchParams();

  params.set("apiKey", apiKey);
  params.set("defaultCrypto", onRamperSymbol);

  const compatibleAssets = adapters.getOnRamperSupportedAssets(assetId)

  params.set("onlyCryptos", compatibleAssets.join(','))

  params.set("wallets", `${onRamperSymbol}:${address}`);

  params.set("isAddressEditable", "false");

  if (action == FiatRampAction.Buy) {
    params.set("supportSell", 'false')
  }

  // because we're dark as well
  params.set("darkMode", "true");

  params.set("redirectURL", "http://localhost:3000");

  return `${baseUrl.toString()}?${params.toString()}`;
};
