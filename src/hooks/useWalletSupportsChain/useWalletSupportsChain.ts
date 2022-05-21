import { ChainId, toChainId } from "@shapeshiftoss/caip";
import {
  HDWallet,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsOsmosis,
} from "@shapeshiftoss/hdwallet-core";
import { ChainTypes, NetworkTypes } from "@shapeshiftoss/types";
import { useSelector } from "react-redux";
import { selectFeatureFlags } from "state/slices/preferencesSlice/selectors";

type UseWalletSupportsChainArgs = { chainId: ChainId; wallet: HDWallet | null };
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean;

// use outside react
export const walletSupportsChain: UseWalletSupportsChain = ({
  chainId,
  wallet,
}) => {
  if (!wallet) return false;
  const featureFlags = useSelector(selectFeatureFlags);

  const ethChainId = toChainId({
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET,
  });
  const btcChainId = toChainId({
    chain: ChainTypes.Bitcoin,
    network: NetworkTypes.MAINNET,
  });
  const cosmosChainId = toChainId({
    chain: ChainTypes.Cosmos,
    network: NetworkTypes.COSMOSHUB_MAINNET,
  });

  const osmosisChainId = toChainId({
    chain: ChainTypes.Osmosis,
    network: NetworkTypes.OSMOSIS_MAINNET,
  });
  switch (chainId) {
    case ethChainId: {
      return supportsETH(wallet);
    }
    case btcChainId: {
      return supportsBTC(wallet);
    }
    case cosmosChainId: {
      return supportsCosmos(wallet);
    }
    case osmosisChainId: {
      return featureFlags["Osmosis"] && supportsOsmosis(wallet);
    }
    default: {
      console.error(`useWalletSupportsChain: unknown chain id ${chainId}`);
      return false;
    }
  }
};

// TODO(0xdef1cafe): this whole thing should belong in chain adapters
export const useWalletSupportsChain: UseWalletSupportsChain = (args) =>
  walletSupportsChain(args);
