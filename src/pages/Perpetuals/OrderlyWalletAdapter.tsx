import type { WalletConnectorContextState } from "@orderly.network/hooks";
import { WalletConnectorContext } from "@orderly.network/hooks";
import { ChainNamespace } from "@orderly.network/types";
import type { FC, PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createNativeWalletEIP1193Provider } from "./NativeWalletProvider";

import { KeyManager } from "@/context/WalletProvider/KeyManager";
import { WalletActions } from "@/context/WalletProvider/actions";
import { useLocalWallet } from "@/context/WalletProvider/local-wallet";
import { useWallet } from "@/hooks/useWallet/useWallet";
import { mipdStore } from "@/lib/mipd";

const ARBITRUM_CHAIN_ID = 42161;
const OPTIMISM_CHAIN_ID = 10;
const POLYGON_CHAIN_ID = 137;
const BASE_CHAIN_ID = 8453;
const AVALANCHE_CHAIN_ID = 43114;
const BNB_CHAIN_ID = 56;

const ORDERLY_SUPPORTED_CHAIN_IDS = [
  ARBITRUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  BASE_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BNB_CHAIN_ID,
];

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

type ConnectedChain = {
  id: number | string;
  namespace: ChainNamespace;
};

type OrderlyWalletState = {
  chains: ConnectedChain[];
  accounts: Array<{ address: string }>;
  icon: string;
  label: string;
  provider: EIP1193Provider | null;
};

const NATIVE_WALLET_TYPES = new Set([KeyManager.Native, KeyManager.Mobile]);

const UNSUPPORTED_WALLET_TYPES = new Set([KeyManager.Keplr]);

export const OrderlyWalletAdapter: FC<PropsWithChildren> = ({ children }) => {
  const {
    state: walletState,
    dispatch,
    disconnect: disconnectWallet,
  } = useWallet();
  const { isConnected, walletInfo, connectedType, wcV2Provider, wallet } =
    walletState;
  const { rdns } = useLocalWallet();

  const nativeProviderRef = useRef<ReturnType<
    typeof createNativeWalletEIP1193Provider
  > | null>(null);

  const [orderlyWallet, setOrderlyWallet] = useState<OrderlyWalletState>({
    chains: ORDERLY_SUPPORTED_CHAIN_IDS.map((id) => ({
      namespace: ChainNamespace.evm,
      id,
    })),
    accounts: [],
    icon: "",
    label: "",
    provider: null,
  });

  const [connectedChain, setConnectedChain] = useState<{
    id: number;
    namespace: ChainNamespace;
  } | null>(null);
  const [settingChain, setSettingChain] = useState(false);

  useEffect(() => {
    const updateWalletState = async () => {
      if (!isConnected) {
        nativeProviderRef.current = null;
        setOrderlyWallet((prev) => ({
          ...prev,
          accounts: [],
          provider: null,
          label: "",
        }));
        setConnectedChain(null);
        return;
      }

      if (connectedType && UNSUPPORTED_WALLET_TYPES.has(connectedType)) {
        console.warn(
          `Orderly Perpetuals does not support ${connectedType} wallet. Please use MetaMask, WalletConnect, or another EVM browser wallet.`,
        );
        setOrderlyWallet((prev) => ({
          ...prev,
          accounts: [],
          provider: null,
          label: "",
        }));
        setConnectedChain(null);
        return;
      }

      let activeProvider: EIP1193Provider | undefined;

      if (connectedType && NATIVE_WALLET_TYPES.has(connectedType) && wallet) {
        if (!nativeProviderRef.current) {
          nativeProviderRef.current = createNativeWalletEIP1193Provider(
            wallet,
            ARBITRUM_CHAIN_ID,
          );
        }
        activeProvider = nativeProviderRef.current;
      } else if (connectedType === KeyManager.WalletConnectV2 && wcV2Provider) {
        activeProvider = wcV2Provider as unknown as EIP1193Provider;
      } else {
        const mipdProviders = mipdStore.getProviders();
        const matchingProvider = rdns
          ? mipdProviders.find((p) => p.info.rdns === rdns && p.provider)
          : mipdProviders.find((p) => p.provider);
        activeProvider = matchingProvider?.provider as
          | EIP1193Provider
          | undefined;
      }

      if (!activeProvider) {
        console.warn("No EIP-1193 provider found for Orderly");
        return;
      }

      try {
        const accounts = (await activeProvider.request({
          method: "eth_accounts",
        })) as string[];
        const chainIdHex = (await activeProvider.request({
          method: "eth_chainId",
        })) as string;
        const chainId = parseInt(chainIdHex, 16);

        console.log("[Orderly] Wallet state updated:", {
          accounts,
          chainIdHex,
          chainId,
          connectedType,
          isSupported: ORDERLY_SUPPORTED_CHAIN_IDS.includes(chainId),
        });

        setOrderlyWallet((prev) => ({
          ...prev,
          accounts: accounts.map((address) => ({ address })),
          provider: activeProvider ?? null,
          label: walletInfo?.name ?? "",
          icon: typeof walletInfo?.icon === "string" ? walletInfo.icon : "",
        }));

        setConnectedChain({
          id: chainId,
          namespace: ChainNamespace.evm,
        });
      } catch (error) {
        console.error("Failed to get wallet state for Orderly:", error);
      }
    };

    updateWalletState();
  }, [isConnected, walletInfo, connectedType, wcV2Provider, wallet, rdns]);

  const connect = useCallback(async () => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true });
    return [];
  }, [dispatch]);

  const disconnect = useCallback(async () => {
    disconnectWallet();
    return [];
  }, [disconnectWallet]);

  const switchChain = useCallback(
    async ({ chainId }: { chainId: string | number }) => {
      if (!orderlyWallet.provider) return;

      setSettingChain(true);
      try {
        const numericChainId =
          typeof chainId === "string" && chainId.startsWith("0x")
            ? parseInt(chainId, 16)
            : Number(chainId);
        const hexChainId = `0x${numericChainId.toString(16)}`;

        await orderlyWallet.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });

        setConnectedChain({
          id: numericChainId,
          namespace: ChainNamespace.evm,
        });
      } catch (error) {
        console.error("Failed to switch chain:", error);
        throw error;
      } finally {
        setSettingChain(false);
      }
    },
    [orderlyWallet.provider],
  );

  const setChain = useCallback(
    async ({ chainId }: { chainId: string | number }) => {
      return switchChain({ chainId: String(chainId) });
    },
    [switchChain],
  );

  const contextValue = useMemo<WalletConnectorContextState>(
    () => ({
      connect,
      disconnect,
      connecting: false,
      setChain,
      chains: ORDERLY_SUPPORTED_CHAIN_IDS,
      switchChain,
      wallet: orderlyWallet,
      connectedChain,
      settingChain,
      namespace: ChainNamespace.evm,
    }),
    [
      connect,
      disconnect,
      setChain,
      switchChain,
      orderlyWallet,
      connectedChain,
      settingChain,
    ],
  );

  return (
    <WalletConnectorContext.Provider value={contextValue}>
      {children}
    </WalletConnectorContext.Provider>
  );
};
