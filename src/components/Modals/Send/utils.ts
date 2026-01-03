import type { AccountId, AssetId, ChainId } from "@shapeshiftoss/caip";
import {
  CHAIN_NAMESPACE,
  fromAccountId,
  fromChainId,
  rujiAssetId,
  tcyAssetId,
  thorchainAssetId,
  thorchainChainId,
} from "@shapeshiftoss/caip";
import type {
  BuildSendTxInput,
  FeeData,
  FeeDataEstimate,
  GetFeeDataInput,
} from "@shapeshiftoss/chain-adapters";
import { utxoChainIds } from "@shapeshiftoss/chain-adapters";
import type { HDWallet } from "@shapeshiftoss/hdwallet-core";
import { supportsETH, supportsSolana } from "@shapeshiftoss/hdwallet-core";
import { isGridPlus } from "@shapeshiftoss/hdwallet-gridplus";
import { isLedger } from "@shapeshiftoss/hdwallet-ledger";
import { isTrezor } from "@shapeshiftoss/hdwallet-trezor";
import type {
  CosmosSdkChainId,
  EvmChainId,
  KnownChainIds,
  UtxoChainId,
} from "@shapeshiftoss/types";
import { contractAddressOrUndefined } from "@shapeshiftoss/utils";

import type { SendInput } from "./Form";

import {
  checkIsMetaMaskDesktop,
  checkIsSnapInstalled,
} from "@/hooks/useIsSnapInstalled/useIsSnapInstalled";
import { bn, bnOrZero } from "@/lib/bignumber/bignumber";
import { assertGetChainAdapter } from "@/lib/utils";
import { assertGetCosmosSdkChainAdapter } from "@/lib/utils/cosmosSdk";
import {
  assertGetEvmChainAdapter,
  getSupportedEvmChainIds,
} from "@/lib/utils/evm";
import { assertGetNearChainAdapter } from "@/lib/utils/near";
import { assertGetSolanaChainAdapter } from "@/lib/utils/solana";
import { assertGetStarknetChainAdapter } from "@/lib/utils/starknet";
import { assertGetSuiChainAdapter } from "@/lib/utils/sui";
import { assertGetUtxoChainAdapter, isUtxoChainId } from "@/lib/utils/utxo";
import {
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
} from "@/state/slices/selectors";
import { store } from "@/state/store";

export type EstimateFeesInput = {
  amountCryptoPrecision: string;
  assetId: AssetId;
  // Optional hex-encoded calldata
  // for ERC-20s, use me in place of `data`
  memo?: string;
  utxoFrom?: string;
  to: string;
  sendMax: boolean;
  accountId: AccountId;
  contractAddress: string | undefined;
};

export const estimateFees = async ({
  amountCryptoPrecision,
  assetId,
  utxoFrom,
  memo,
  to,
  sendMax,
  accountId,
  contractAddress,
}: EstimateFeesInput): Promise<FeeDataEstimate<ChainId>> => {
  const { account } = fromAccountId(accountId);
  const state = store.getState();
  const asset = selectAssetById(state, assetId);
  if (!asset) throw new Error(`Asset not found for ${assetId}`);
  const value = bnOrZero(amountCryptoPrecision)
    .times(bn(10).exponentiatedBy(asset.precision))
    .toFixed(0);

  const { chainNamespace } = fromChainId(asset.chainId);

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.CosmosSdk: {
      const adapter = assertGetCosmosSdkChainAdapter(asset.chainId);
      const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = {};
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Evm: {
      const adapter = assertGetEvmChainAdapter(asset.chainId);
      const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
        to,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
          data: memo,
        },
        sendMax,
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = assertGetUtxoChainAdapter(asset.chainId);
      const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
        to,
        value,
        chainSpecific: { from: utxoFrom, pubkey: account },
        sendMax,
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Solana: {
      const adapter = assertGetSolanaChainAdapter(asset.chainId);

      // For SPL transfers, build complete instruction set including compute budget
      // For SOL transfers (pure sends i.e not e.g a Jup swap), pass no instructions to get 0 count (avoids blind signing)
      const instructions = contractAddress
        ? await adapter.buildEstimationInstructions({
            from: account,
            to,
            tokenId: contractAddress,
            value,
          })
        : undefined;

      const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
        to,
        value,
        chainSpecific: {
          from: account,
          tokenId: contractAddress,
          instructions,
        },
        sendMax,
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Tron: {
      const adapter = assertGetChainAdapter(asset.chainId);
      const getFeeDataInput: GetFeeDataInput<KnownChainIds.TronMainnet> = {
        to,
        value,
        sendMax,
        chainSpecific: {
          from: account,
          contractAddress,
          memo,
        },
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Sui: {
      const adapter = assertGetSuiChainAdapter(asset.chainId);
      const getFeeDataInput: GetFeeDataInput<KnownChainIds.SuiMainnet> = {
        to,
        value,
        chainSpecific: {
          from: account,
          tokenId: contractAddress,
        },
        sendMax,
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Near: {
      const adapter = assertGetNearChainAdapter(asset.chainId);
      const getFeeDataInput: GetFeeDataInput<KnownChainIds.NearMainnet> = {
        to,
        value,
        chainSpecific: { from: account },
        sendMax,
      };
      return adapter.getFeeData(getFeeDataInput);
    }
    case CHAIN_NAMESPACE.Starknet: {
      const adapter = assertGetStarknetChainAdapter(asset.chainId);
      return adapter.getFeeData();
    }
    default:
      throw new Error(`${chainNamespace} not supported`);
  }
};

export const handleSend = async ({
  sendInput,
  wallet,
}: {
  sendInput: SendInput;
  wallet: HDWallet;
}): Promise<string> => {
  const { asset, chainId, accountMetadata, adapter } =
    prepareSendAdapter(sendInput);
  const supportedEvmChainIds = getSupportedEvmChainIds();
  const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet);
  const isVultisig = (await wallet.getModel()) === "Vultisig";
  const skipDeviceDerivation =
    isLedger(wallet) || isTrezor(wallet) || isGridPlus(wallet);
  if (
    fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk &&
    !wallet.supportsOfflineSigning() &&
    // MM only supports snap things... if the snap is installed
    // Vultisig signs directly via extension
    (!isMetaMaskDesktop ||
      (isMetaMaskDesktop && !(await checkIsSnapInstalled()))) &&
    !isVultisig
  ) {
    throw new Error(`unsupported wallet: ${await wallet.getModel()}`);
  }

  const value = bnOrZero(sendInput.amountCryptoPrecision)
    .times(bn(10).exponentiatedBy(asset.precision))
    .toFixed(0);

  const { estimatedFees, feeType, to, memo, from } = sendInput;
  const { bip44Params, accountType } = accountMetadata;
  if (!bip44Params) {
    throw new Error(
      `useFormSend: no bip44Params for accountId ${sendInput.accountId}`,
    );
  }

  const result = await (async () => {
    if (supportedEvmChainIds.includes(chainId as KnownChainIds)) {
      if (!supportsETH(wallet))
        throw new Error(`useFormSend: wallet does not support ethereum`);
      const fees = estimatedFees[feeType] as FeeData<EvmChainId>;
      const {
        chainSpecific: {
          gasPrice,
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
        },
      } = fees;
      const shouldUseEIP1559Fees =
        (await wallet.ethSupportsEIP1559()) &&
        maxFeePerGas !== undefined &&
        maxPriorityFeePerGas !== undefined;
      if (!shouldUseEIP1559Fees && gasPrice === undefined) {
        throw new Error(`useFormSend: missing gasPrice for non-EIP-1559 tx`);
      }
      const contractAddress = contractAddressOrUndefined(asset.assetId);
      const { accountNumber } = bip44Params;
      const adapter = assertGetEvmChainAdapter(chainId);
      const pubKey = skipDeviceDerivation
        ? fromAccountId(sendInput.accountId).account
        : undefined;
      return await adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          data: memo,
          contractAddress,
          gasLimit,
          ...(shouldUseEIP1559Fees
            ? { maxFeePerGas, maxPriorityFeePerGas }
            : { gasPrice }),
        },
        sendMax: sendInput.sendMax,
        customNonce: sendInput.customNonce,
        pubKey,
      });
    }

    if (utxoChainIds.some((utxoChainId) => utxoChainId === chainId)) {
      const fees = estimatedFees[feeType] as FeeData<UtxoChainId>;

      if (!accountType) {
        throw new Error(
          `useFormSend: no accountType for utxo from accountId: ${sendInput.accountId}`,
        );
      }
      const { accountNumber } = bip44Params;
      const adapter = assertGetUtxoChainAdapter(chainId);
      const pubKey = skipDeviceDerivation
        ? fromAccountId(sendInput.accountId).account
        : undefined;
      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          from,
          satoshiPerByte: fees.chainSpecific.satoshiPerByte,
          accountType,
          opReturnData: memo,
        },
        sendMax: sendInput.sendMax,
        pubKey,
      });
    }

    if (
      fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk
    ) {
      const fees = estimatedFees[feeType] as FeeData<CosmosSdkChainId>;
      const { accountNumber } = bip44Params;

      const maybeCoin = (() => {
        // We only support coin sends for THORChain, not Cosmos SDK
        if (chainId !== thorchainChainId) return {};

        if (sendInput.assetId === tcyAssetId) return { coin: "THOR.TCY" };
        if (sendInput.assetId === rujiAssetId) return { coin: "THOR.RUJI" };
        if (sendInput.assetId === thorchainAssetId) return {};

        throw new Error("Unsupported THORChain asset");
      })();

      const params = {
        to,
        memo: (sendInput as SendInput<CosmosSdkChainId>).memo,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          gas: fees.chainSpecific.gasLimit,
          fee: fees.txFee,
          ...maybeCoin,
        },
        sendMax: sendInput.sendMax,
      };
      const adapter = assertGetCosmosSdkChainAdapter(chainId);
      return adapter.buildSendTransaction(params);
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Solana) {
      if (!supportsSolana(wallet))
        throw new Error(`useFormSend: wallet does not support solana`);

      const contractAddress = contractAddressOrUndefined(asset.assetId);
      const fees = estimatedFees[
        feeType
      ] as FeeData<KnownChainIds.SolanaMainnet>;

      const solanaAdapter = assertGetSolanaChainAdapter(chainId);
      const { account } = fromAccountId(sendInput.accountId);
      const instructions = await solanaAdapter.buildEstimationInstructions({
        from: account,
        to,
        tokenId: contractAddress,
        value,
      });

      const input: BuildSendTxInput<KnownChainIds.SolanaMainnet> = {
        to,
        value,
        wallet,
        accountNumber: bip44Params.accountNumber,
        pubKey: skipDeviceDerivation
          ? fromAccountId(sendInput.accountId).account
          : undefined,
        chainSpecific:
          instructions.length <= 1
            ? {
                tokenId: contractAddress,
              }
            : {
                tokenId: contractAddress,
                computeUnitLimit: fees.chainSpecific.computeUnits,
                computeUnitPrice: fees.chainSpecific.priorityFee,
              },
      };

      return solanaAdapter.buildSendTransaction(input);
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Tron) {
      const { accountNumber } = bip44Params;
      const adapter = assertGetChainAdapter(chainId);
      const contractAddress = contractAddressOrUndefined(asset.assetId);
      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        sendMax: sendInput.sendMax,
        chainSpecific: {
          contractAddress,
        },
      } as BuildSendTxInput<KnownChainIds.TronMainnet>);
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Sui) {
      const { accountNumber } = bip44Params;
      const adapter = assertGetSuiChainAdapter(chainId);
      const contractAddress = contractAddressOrUndefined(asset.assetId);
      const fees = estimatedFees[feeType] as FeeData<KnownChainIds.SuiMainnet>;

      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        pubKey:
          isLedger(wallet) || isTrezor(wallet)
            ? fromAccountId(sendInput.accountId).account
            : undefined,
        sendMax: sendInput.sendMax,
        chainSpecific: {
          tokenId: contractAddress,
          gasBudget: fees.chainSpecific.gasBudget,
          gasPrice: fees.chainSpecific.gasPrice,
        },
      } as BuildSendTxInput<KnownChainIds.SuiMainnet>);
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Near) {
      const { accountNumber } = bip44Params;
      const adapter = assertGetNearChainAdapter(chainId);
      const fees = estimatedFees[feeType] as FeeData<KnownChainIds.NearMainnet>;
      const contractAddress = contractAddressOrUndefined(asset.assetId);

      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        pubKey: fromAccountId(sendInput.accountId).account,
        sendMax: sendInput.sendMax,
        chainSpecific: {
          gasPrice: fees.chainSpecific.gasPrice,
          contractAddress,
        },
      } as BuildSendTxInput<KnownChainIds.NearMainnet>);
    }

    if (
      fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Starknet
    ) {
      const { accountNumber } = bip44Params;
      const adapter = assertGetStarknetChainAdapter(chainId);
      const contractAddress = contractAddressOrUndefined(asset.assetId);
      const fees = estimatedFees[
        feeType
      ] as FeeData<KnownChainIds.StarknetMainnet>;

      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        pubKey:
          isLedger(wallet) || isTrezor(wallet)
            ? fromAccountId(sendInput.accountId).account
            : undefined,
        sendMax: sendInput.sendMax,
        chainSpecific: {
          tokenContractAddress: contractAddress,
          maxFee: fees.chainSpecific.maxFee,
        },
      } as BuildSendTxInput<KnownChainIds.StarknetMainnet>);
    }

    throw new Error(`${chainId} not supported`);
  })();

  const txToSign = result.txToSign;

  const senderAddress = await adapter.getAddress({
    accountNumber: accountMetadata.bip44Params.accountNumber,
    accountType: accountMetadata.accountType,
    wallet,
    pubKey: skipDeviceDerivation
      ? fromAccountId(sendInput.accountId).account
      : undefined,
  });

  const broadcastTXID = await (async () => {
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign,
        wallet,
      });
      return adapter.broadcastTransaction({
        senderAddress,
        receiverAddress: to,
        hex: signedTx,
      });
    } else if (wallet.supportsBroadcast()) {
      /**
       * signAndBroadcastTransaction is an optional method on the HDWallet interface.
       * Check and see if it exists; if so, call and make sure a txhash is returned
       */
      if (!adapter.signAndBroadcastTransaction) {
        throw new Error("signAndBroadcastTransaction undefined for wallet");
      }
      return adapter.signAndBroadcastTransaction({
        senderAddress,
        receiverAddress: to,
        signTxInput: { txToSign, wallet },
      });
    } else {
      throw new Error("Bad hdwallet config");
    }
  })();

  if (!broadcastTXID) {
    throw new Error("Broadcast failed");
  }

  return broadcastTXID;
};

const prepareSendAdapter = (sendInput: SendInput) => {
  const state = store.getState();
  const asset = selectAssetById(state, sendInput.assetId ?? "");
  if (!asset)
    throw new Error(`No asset found for assetId ${sendInput.assetId}`);

  const chainId = asset.chainId;
  const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, {
    accountId: sendInput.accountId,
  });
  if (!accountMetadata) {
    throw new Error(`No accountMetadata found for ${sendInput.accountId}`);
  }

  const adapter = assertGetChainAdapter(chainId);

  return { asset, chainId, accountMetadata, adapter };
};

export const maybeFetchChangeAddress = async ({
  sendInput,
  wallet,
}: {
  sendInput: SendInput;
  wallet: HDWallet;
}): Promise<string | undefined> => {
  try {
    const { chainId, accountMetadata, adapter } = prepareSendAdapter(sendInput);

    // Only fetch for UTXO chains on Ledger wallets
    if (!isUtxoChainId(chainId) || !isLedger(wallet)) return undefined;

    const changeAddress = await adapter.getAddress({
      accountNumber: accountMetadata.bip44Params.accountNumber,
      accountType: accountMetadata.accountType,
      wallet,
      isChange: true,
    });
    return changeAddress;
  } catch (error) {
    console.error("Failed to fetch change address:", error);
    return undefined;
  }
};
