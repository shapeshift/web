import type { ChainId } from "@shapeshiftoss/caip";
import { arbitrumChainId } from "@shapeshiftoss/caip";
import type { EvmChainAdapter } from "@shapeshiftoss/chain-adapters";
import { toAddressNList } from "@shapeshiftoss/chain-adapters";
import { viemClientByNetworkId } from "@shapeshiftoss/contracts";
import type { HDWallet } from "@shapeshiftoss/hdwallet-core";
import type { NativeHDWallet } from "@shapeshiftoss/hdwallet-native";
import type { Address, Hex } from "viem";
import { getAddress as toChecksumAddress } from "viem";

import { getChainAdapterManager } from "@/context/PluginProvider/chainAdapterSingleton";

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

const EVM_CHAIN_IDS: Record<number, ChainId> = {
  1: "eip155:1",
  10: "eip155:10",
  56: "eip155:56",
  137: "eip155:137",
  8453: "eip155:8453",
  42161: arbitrumChainId,
  43114: "eip155:43114",
};

const DEFAULT_ACCOUNT_NUMBER = 0;

export const createNativeWalletEIP1193Provider = (
  wallet: HDWallet,
  initialChainId: number = 42161,
): EIP1193Provider => {
  let currentChainId = initialChainId;
  const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};

  const getChainAdapter = (): EvmChainAdapter => {
    const shapeshiftChainId = EVM_CHAIN_IDS[currentChainId];
    if (!shapeshiftChainId) {
      throw new Error(`Unsupported chain ID: ${currentChainId}`);
    }
    const chainAdapterManager = getChainAdapterManager();
    const adapter = chainAdapterManager.get(shapeshiftChainId);
    if (!adapter) {
      throw new Error(`No chain adapter found for chain ID: ${currentChainId}`);
    }
    return adapter as unknown as EvmChainAdapter;
  };

  const getAddressNList = () => {
    const adapter = getChainAdapter();
    const bip44Params = adapter.getBip44Params({
      accountNumber: DEFAULT_ACCOUNT_NUMBER,
    });
    return toAddressNList(bip44Params);
  };

  const getAddress = async (): Promise<string> => {
    const adapter = getChainAdapter();
    const address = await adapter.getAddress({
      accountNumber: DEFAULT_ACCOUNT_NUMBER,
      wallet,
    });
    return address;
  };

  const emit = (event: string, ...args: unknown[]) => {
    const handlers = eventHandlers[event];
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  };

  const provider: EIP1193Provider = {
    request: async ({ method, params = [] }) => {
      switch (method) {
        case "eth_chainId": {
          return `0x${currentChainId.toString(16)}`;
        }

        case "eth_accounts":
        case "eth_requestAccounts": {
          const address = await getAddress();
          return [address];
        }

        case "net_version": {
          return currentChainId.toString();
        }

        case "personal_sign": {
          const [message, _address] = params as [string, string];
          const adapter = getChainAdapter();
          const addressNList = getAddressNList();

          const decodedMessage =
            typeof message === "string" && message.startsWith("0x")
              ? Buffer.from(message.slice(2), "hex").toString("utf8")
              : message;

          console.log("[Orderly] personal_sign request:", {
            originalMessage: message,
            decodedMessage,
            addressNList,
          });

          const messageToSign = {
            addressNList,
            message: decodedMessage,
          };

          const signedMessage = await adapter.signMessage({
            messageToSign,
            wallet,
          });

          console.log("[Orderly] personal_sign result:", signedMessage);

          if (!signedMessage) {
            throw new Error("Failed to sign message");
          }

          return signedMessage;
        }

        case "eth_sign": {
          const [address, message] = params as [string, string];
          return provider.request({
            method: "personal_sign",
            params: [message, address],
          });
        }

        case "eth_signTypedData":
        case "eth_signTypedData_v3":
        case "eth_signTypedData_v4": {
          const [_address, typedDataString] = params as [string, string];
          const typedData =
            typeof typedDataString === "string"
              ? JSON.parse(typedDataString)
              : typedDataString;
          const addressNList = getAddressNList();

          console.log("[Orderly] signTypedData request:", {
            method,
            typedData,
            addressNList,
          });

          const nativeWallet = wallet as NativeHDWallet;
          if (!nativeWallet.ethSignTypedData) {
            throw new Error("Wallet does not support signTypedData");
          }

          const signedData = await nativeWallet.ethSignTypedData({
            addressNList,
            typedData,
          });

          console.log("[Orderly] signTypedData result:", signedData);

          if (!signedData) {
            throw new Error("Failed to sign typed data");
          }

          return signedData.signature;
        }

        case "eth_sendTransaction": {
          const [txParams] = params as [
            {
              from: string;
              to: string;
              data?: string;
              value?: string;
              gas?: string;
              gasPrice?: string;
              maxFeePerGas?: string;
              maxPriorityFeePerGas?: string;
              nonce?: string;
            },
          ];

          const adapter = getChainAdapter();
          const senderAddress = await getAddress();
          const client = viemClientByNetworkId[currentChainId];

          const baseTxParams = {
            wallet,
            accountNumber: DEFAULT_ACCOUNT_NUMBER,
            to: txParams.to,
            data: txParams.data ?? "",
            value: txParams.value ?? "0",
            gasLimit: txParams.gas ?? "100000",
          };

          let txToSign: Awaited<
            ReturnType<typeof adapter.buildCustomTx>
          >["txToSign"];

          const toDecimal = (value: string): string =>
            value.startsWith("0x") ? BigInt(value).toString() : value;

          if (txParams.maxFeePerGas) {
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas: toDecimal(txParams.maxFeePerGas),
              maxPriorityFeePerGas: toDecimal(
                txParams.maxPriorityFeePerGas ?? "0",
              ),
            });
            txToSign = result.txToSign;
          } else if (txParams.gasPrice && txParams.gasPrice !== "0") {
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              gasPrice: toDecimal(txParams.gasPrice),
            });
            txToSign = result.txToSign;
          } else if (client) {
            const feeData = await client.estimateFeesPerGas();
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas: (feeData.maxFeePerGas ?? 0n).toString(),
              maxPriorityFeePerGas: (
                feeData.maxPriorityFeePerGas ?? 0n
              ).toString(),
            });
            txToSign = result.txToSign;
          } else {
            const gasFeeData = await adapter.getGasFeeData();
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas:
                gasFeeData.fast.maxFeePerGas ?? gasFeeData.fast.gasPrice,
              maxPriorityFeePerGas: gasFeeData.fast.maxPriorityFeePerGas ?? "0",
            });
            txToSign = result.txToSign;
          }

          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          });

          const txHash = await adapter.broadcastTransaction({
            senderAddress,
            receiverAddress: txParams.to,
            hex: signedTx,
          });

          return txHash;
        }

        case "eth_signTransaction": {
          const [txParams] = params as [
            {
              from: string;
              to: string;
              data?: string;
              value?: string;
              gas?: string;
              gasPrice?: string;
              maxFeePerGas?: string;
              maxPriorityFeePerGas?: string;
              nonce?: string;
            },
          ];

          const adapter = getChainAdapter();
          const client = viemClientByNetworkId[currentChainId];

          const baseTxParams = {
            wallet,
            accountNumber: DEFAULT_ACCOUNT_NUMBER,
            to: txParams.to,
            data: txParams.data ?? "",
            value: txParams.value ?? "0",
            gasLimit: txParams.gas ?? "100000",
          };

          let txToSign: Awaited<
            ReturnType<typeof adapter.buildCustomTx>
          >["txToSign"];

          const toDecimal = (value: string): string =>
            value.startsWith("0x") ? BigInt(value).toString() : value;

          if (txParams.maxFeePerGas) {
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas: toDecimal(txParams.maxFeePerGas),
              maxPriorityFeePerGas: toDecimal(
                txParams.maxPriorityFeePerGas ?? "0",
              ),
            });
            txToSign = result.txToSign;
          } else if (txParams.gasPrice && txParams.gasPrice !== "0") {
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              gasPrice: toDecimal(txParams.gasPrice),
            });
            txToSign = result.txToSign;
          } else if (client) {
            const feeData = await client.estimateFeesPerGas();
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas: (feeData.maxFeePerGas ?? 0n).toString(),
              maxPriorityFeePerGas: (
                feeData.maxPriorityFeePerGas ?? 0n
              ).toString(),
            });
            txToSign = result.txToSign;
          } else {
            const gasFeeData = await adapter.getGasFeeData();
            const result = await adapter.buildCustomTx({
              ...baseTxParams,
              maxFeePerGas:
                gasFeeData.fast.maxFeePerGas ?? gasFeeData.fast.gasPrice,
              maxPriorityFeePerGas: gasFeeData.fast.maxPriorityFeePerGas ?? "0",
            });
            txToSign = result.txToSign;
          }

          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          });

          return signedTx;
        }

        case "wallet_switchEthereumChain": {
          const [{ chainId: newChainIdHex }] = params as [{ chainId: string }];
          const newChainId = parseInt(newChainIdHex, 16);

          if (!EVM_CHAIN_IDS[newChainId]) {
            throw {
              code: 4902,
              message: `Chain ${newChainId} not supported`,
            };
          }

          currentChainId = newChainId;
          emit("chainChanged", newChainIdHex);
          return null;
        }

        case "wallet_addEthereumChain": {
          const [{ chainId: newChainIdHex }] = params as [{ chainId: string }];
          const newChainId = parseInt(newChainIdHex, 16);

          if (!EVM_CHAIN_IDS[newChainId]) {
            throw {
              code: 4902,
              message: `Chain ${newChainId} not supported`,
            };
          }

          return null;
        }

        case "eth_getBalance": {
          const [address, blockTag = "latest"] = params as [string, string?];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const balance = await client.getBalance({
            address: toChecksumAddress(address) as Address,
            blockTag: blockTag as
              | "latest"
              | "earliest"
              | "pending"
              | "safe"
              | "finalized",
          });
          return `0x${balance.toString(16)}`;
        }

        case "eth_call": {
          const [callParams, blockTag = "latest"] = params as [
            {
              to: string;
              data?: string;
              from?: string;
              value?: string;
              gas?: string;
            },
            string?,
          ];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const result = await client.call({
            to: toChecksumAddress(callParams.to) as Address,
            data: callParams.data as Hex | undefined,
            account: callParams.from
              ? (toChecksumAddress(callParams.from) as Address)
              : undefined,
            value: callParams.value ? BigInt(callParams.value) : undefined,
            gas: callParams.gas ? BigInt(callParams.gas) : undefined,
            blockTag: blockTag as
              | "latest"
              | "earliest"
              | "pending"
              | "safe"
              | "finalized",
          });
          return result.data ?? "0x";
        }

        case "eth_estimateGas": {
          const [estimateParams] = params as [
            { to?: string; data?: string; from?: string; value?: string },
          ];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const gas = await client.estimateGas({
            to: estimateParams.to
              ? (toChecksumAddress(estimateParams.to) as Address)
              : undefined,
            data: estimateParams.data as Hex | undefined,
            account: estimateParams.from
              ? (toChecksumAddress(estimateParams.from) as Address)
              : undefined,
            value: estimateParams.value
              ? BigInt(estimateParams.value)
              : undefined,
          });
          return `0x${gas.toString(16)}`;
        }

        case "eth_gasPrice": {
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const gasPrice = await client.getGasPrice();
          return `0x${gasPrice.toString(16)}`;
        }

        case "eth_blockNumber": {
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const blockNumber = await client.getBlockNumber();
          return `0x${blockNumber.toString(16)}`;
        }

        case "eth_getTransactionCount": {
          const [address, blockTag = "latest"] = params as [string, string?];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const nonce = await client.getTransactionCount({
            address: toChecksumAddress(address) as Address,
            blockTag: blockTag as
              | "latest"
              | "earliest"
              | "pending"
              | "safe"
              | "finalized",
          });
          return `0x${nonce.toString(16)}`;
        }

        case "eth_getTransactionByHash": {
          const [txHash] = params as [string];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const transaction = await client.getTransaction({
            hash: txHash as Hex,
          });
          return transaction;
        }

        case "eth_getTransactionReceipt": {
          const [txHash] = params as [string];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const receipt = await client.getTransactionReceipt({
            hash: txHash as Hex,
          });
          return receipt;
        }

        case "eth_getCode": {
          const [address, blockTag = "latest"] = params as [string, string?];
          const client = viemClientByNetworkId[currentChainId];
          if (!client) {
            throw new Error(`No viem client for chain ID: ${currentChainId}`);
          }
          const bytecode = await client.getBytecode({
            address: toChecksumAddress(address) as Address,
            blockTag: blockTag as
              | "latest"
              | "earliest"
              | "pending"
              | "safe"
              | "finalized",
          });
          return bytecode ?? "0x";
        }

        default: {
          console.warn(
            `Method ${method} not supported by native wallet provider`,
          );
          throw new Error(
            `Method ${method} not supported by native wallet provider`,
          );
        }
      }
    },

    on: (event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    },

    removeListener: (event, handler) => {
      const handlers = eventHandlers[event];
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    },
  };

  return provider;
};
