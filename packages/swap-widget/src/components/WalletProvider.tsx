import {
  ConnectButton,
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { WalletClient } from "viem";
import { useWalletClient, WagmiProvider } from "wagmi";

import { createWagmiConfig } from "../config/wagmi";
import type { ThemeMode } from "../types";

const queryClient = new QueryClient();

type InternalWalletProviderProps = {
  projectId: string;
  children: (walletClient: WalletClient | undefined) => ReactNode;
  themeMode: ThemeMode;
};

const InternalWalletContent = ({
  children,
}: {
  children: (walletClient: WalletClient | undefined) => ReactNode;
}) => {
  const { data: walletClient } = useWalletClient();
  return <>{children(walletClient)}</>;
};

export const InternalWalletProvider = ({
  projectId,
  children,
  themeMode,
}: InternalWalletProviderProps) => {
  const config = useMemo(() => createWagmiConfig(projectId), [projectId]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={themeMode === "dark" ? darkTheme() : lightTheme()}
        >
          <InternalWalletContent>{children}</InternalWalletContent>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const ConnectWalletButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="ssw-connect-btn"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                    Connect
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="ssw-connect-btn ssw-wrong-network"
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  type="button"
                  className="ssw-connect-btn ssw-connected"
                >
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
