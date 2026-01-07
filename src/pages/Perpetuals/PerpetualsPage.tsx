import {
  useAccount,
  useWalletConnector,
  useChains,
} from "@orderly.network/hooks";
import { OrderlyAppProvider } from "@orderly.network/react-app";
import { TradingPage } from "@orderly.network/trading";
import type { API } from "@orderly.network/types";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { OrderlyWalletAdapter } from "./OrderlyWalletAdapter";

import { getConfig } from "@/config";

import "@orderly.network/ui/dist/styles.css";

const ORDERLY_BROKER_ID = getConfig().VITE_ORDERLY_BROKER_ID;
const DEFAULT_SYMBOL = "PERP_ETH_USDC";

const tradingViewConfig = {
  scriptSRC: "/charting_library/charting_library.js",
  library_path: "/charting_library/",
};

const AccountStatusDebug: FC = () => {
  const { state, account } = useAccount();
  const walletConnector = useWalletConnector();
  const [chains] = useChains("mainnet");

  useEffect(() => {
    console.log("[Orderly] Account state:", {
      status: state.status,
      address: state.address,
      accountId: state.accountId,
      userId: state.userId,
      account,
    });
  }, [state, account]);

  useEffect(() => {
    console.log("[Orderly] Wallet connector state:", {
      connectedChain: walletConnector.connectedChain,
      wallet: walletConnector.wallet,
      chains: walletConnector.chains,
      namespace: walletConnector.namespace,
    });
  }, [walletConnector]);

  useEffect(() => {
    console.log("[Orderly] Available chains:", chains);
  }, [chains]);

  return null;
};

export const PerpetualsPage: FC = () => {
  const navigate = useNavigate();
  const { symbol: symbolParam } = useParams<{ symbol?: string }>();
  const [symbol, setSymbol] = useState(symbolParam ?? DEFAULT_SYMBOL);

  const handleSymbolChange = useCallback(
    (data: API.Symbol) => {
      const newSymbol = data.symbol;
      setSymbol(newSymbol);
      navigate(`/perpetuals/${newSymbol}`, { replace: true });
    },
    [navigate],
  );

  const orderlyAppConfig = useMemo(
    () => ({
      brokerId: ORDERLY_BROKER_ID,
      networkId: "mainnet" as const,
      appIcons: {
        main: {
          img: "/fox-token-logo.png",
        },
        secondary: {
          img: "/fox-token-logo.png",
        },
      },
    }),
    [],
  );

  return (
    <OrderlyWalletAdapter>
      <OrderlyAppProvider {...orderlyAppConfig}>
        <AccountStatusDebug />
        <TradingPage
          symbol={symbol}
          onSymbolChange={handleSymbolChange}
          tradingViewConfig={tradingViewConfig}
        />
      </OrderlyAppProvider>
    </OrderlyWalletAdapter>
  );
};
