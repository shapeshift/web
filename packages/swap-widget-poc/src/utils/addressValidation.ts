import { isAddress } from "viem";
import type { ChainId } from "../types";
import { getChainType, COSMOS_CHAIN_IDS } from "../types";

/**
 * Validates an EVM address using viem
 */
export const isValidEvmAddress = (address: string): boolean => {
  return isAddress(address, { strict: false });
};

/**
 * Validates a Bitcoin address (Legacy, SegWit, Native SegWit, Taproot)
 */
export const isValidBitcoinAddress = (address: string): boolean => {
  // Legacy (P2PKH) - starts with 1
  const legacyRegex = /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  // Legacy (P2SH) - starts with 3
  const p2shRegex = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  // Native SegWit (Bech32) - starts with bc1q
  const nativeSegwitRegex = /^bc1q[a-z0-9]{38,58}$/i;
  // Taproot (Bech32m) - starts with bc1p
  const taprootRegex = /^bc1p[a-z0-9]{58}$/i;

  return (
    legacyRegex.test(address) ||
    p2shRegex.test(address) ||
    nativeSegwitRegex.test(address) ||
    taprootRegex.test(address)
  );
};

/**
 * Validates a Bitcoin Cash address
 */
export const isValidBitcoinCashAddress = (address: string): boolean => {
  // CashAddr format - starts with bitcoincash: or just q/p
  const cashAddrRegex = /^(bitcoincash:)?[qp][a-z0-9]{41}$/i;
  // Legacy format (same as Bitcoin)
  const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

  return cashAddrRegex.test(address) || legacyRegex.test(address);
};

/**
 * Validates a Litecoin address
 */
export const isValidLitecoinAddress = (address: string): boolean => {
  // Legacy (P2PKH) - starts with L
  const legacyRegex = /^L[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  // Legacy (P2SH) - starts with M or 3
  const p2shRegex = /^[M3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
  // Native SegWit (Bech32) - starts with ltc1
  const nativeSegwitRegex = /^ltc1[a-z0-9]{38,58}$/i;

  return (
    legacyRegex.test(address) ||
    p2shRegex.test(address) ||
    nativeSegwitRegex.test(address)
  );
};

/**
 * Validates a Dogecoin address
 */
export const isValidDogecoinAddress = (address: string): boolean => {
  // P2PKH - starts with D
  const p2pkhRegex = /^D[5-9A-HJ-NP-U][a-km-zA-HJ-NP-Z1-9]{32}$/;
  // P2SH - starts with 9 or A
  const p2shRegex = /^[9A][a-km-zA-HJ-NP-Z1-9]{33}$/;

  return p2pkhRegex.test(address) || p2shRegex.test(address);
};

/**
 * Validates a Cosmos SDK address (bech32 format)
 */
export const isValidCosmosAddress = (
  address: string,
  expectedPrefix?: string,
): boolean => {
  // Basic bech32 validation - prefix + 1 + base32 characters
  const bech32Regex = /^[a-z]{1,83}1[a-z0-9]{38,58}$/i;

  if (!bech32Regex.test(address)) {
    return false;
  }

  // If prefix is specified, validate it
  if (expectedPrefix) {
    return address.toLowerCase().startsWith(expectedPrefix.toLowerCase());
  }

  return true;
};

/**
 * Gets the expected bech32 prefix for a Cosmos chain
 */
const getCosmosPrefix = (chainId: ChainId): string | undefined => {
  const prefixMap: Record<string, string> = {
    [COSMOS_CHAIN_IDS.cosmos]: "cosmos",
    [COSMOS_CHAIN_IDS.thorchain]: "thor",
    [COSMOS_CHAIN_IDS.mayachain]: "maya",
  };
  return prefixMap[chainId];
};

/**
 * Validates a Solana address (base58, 32-44 chars)
 */
export const isValidSolanaAddress = (address: string): boolean => {
  // Solana addresses are base58 encoded, typically 32-44 characters
  // Base58 alphabet excludes 0, O, I, l
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

/**
 * Validates an address for a specific chain
 */
export const validateAddress = (
  address: string,
  chainId: ChainId,
): { valid: boolean; error?: string } => {
  if (!address || address.trim() === "") {
    return { valid: false, error: "Address is required" };
  }

  const trimmedAddress = address.trim();
  const chainType = getChainType(chainId);

  switch (chainType) {
    case "evm":
      if (!isValidEvmAddress(trimmedAddress)) {
        return { valid: false, error: "Invalid EVM address" };
      }
      break;

    case "utxo":
      // Determine specific UTXO chain
      if (chainId.includes("000000000019d6689c085ae165831e93")) {
        // Bitcoin
        if (!isValidBitcoinAddress(trimmedAddress)) {
          return { valid: false, error: "Invalid Bitcoin address" };
        }
      } else if (chainId.includes("000000000000000000651ef99cb9fcbe")) {
        // Bitcoin Cash
        if (!isValidBitcoinCashAddress(trimmedAddress)) {
          return { valid: false, error: "Invalid Bitcoin Cash address" };
        }
      } else if (chainId.includes("12a765e31ffd4059bada1e25190f6e98")) {
        // Litecoin
        if (!isValidLitecoinAddress(trimmedAddress)) {
          return { valid: false, error: "Invalid Litecoin address" };
        }
      } else if (chainId.includes("00000000001a91e3dace36e2be3bf030")) {
        // Dogecoin
        if (!isValidDogecoinAddress(trimmedAddress)) {
          return { valid: false, error: "Invalid Dogecoin address" };
        }
      } else {
        return { valid: false, error: "Unsupported UTXO chain" };
      }
      break;

    case "cosmos":
      const expectedPrefix = getCosmosPrefix(chainId);
      if (!isValidCosmosAddress(trimmedAddress, expectedPrefix)) {
        const chainName = expectedPrefix
          ? expectedPrefix.charAt(0).toUpperCase() + expectedPrefix.slice(1)
          : "Cosmos";
        return { valid: false, error: `Invalid ${chainName} address` };
      }
      break;

    case "solana":
      if (!isValidSolanaAddress(trimmedAddress)) {
        return { valid: false, error: "Invalid Solana address" };
      }
      break;

    default:
      return { valid: false, error: "Unsupported chain type" };
  }

  return { valid: true };
};

/**
 * Gets the expected address format hint for a chain
 */
export const getAddressFormatHint = (chainId: ChainId): string => {
  const chainType = getChainType(chainId);

  switch (chainType) {
    case "evm":
      return "0x...";
    case "utxo":
      if (chainId.includes("000000000019d6689c085ae165831e93")) {
        return "bc1... or 1... or 3...";
      } else if (chainId.includes("000000000000000000651ef99cb9fcbe")) {
        return "bitcoincash:q... or 1...";
      } else if (chainId.includes("12a765e31ffd4059bada1e25190f6e98")) {
        return "ltc1... or L... or M...";
      } else if (chainId.includes("00000000001a91e3dace36e2be3bf030")) {
        return "D...";
      }
      return "Enter address";
    case "cosmos":
      const prefix = getCosmosPrefix(chainId);
      return prefix ? `${prefix}1...` : "Enter address";
    case "solana":
      return "Base58 address";
    default:
      return "Enter address";
  }
};
