import { useBalance, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getBalance } from "@wagmi/core";
import { useConfig } from "wagmi";
import type { AssetId } from "../types";
import { formatAmount, getEvmChainIdNumber } from "../types";
import { erc20Abi } from "viem";

type BalanceResult = {
  assetId: AssetId;
  balance: string;
  balanceFormatted: string;
};

type BalancesMap = Record<AssetId, BalanceResult>;

const parseAssetId = (
  assetId: AssetId,
): { chainId: number; tokenAddress?: `0x${string}` } | null => {
  const [chainPart, assetPart] = assetId.split("/");

  if (!chainPart?.startsWith("eip155:")) return null;

  const chainId = getEvmChainIdNumber(chainPart);

  if (!assetPart) return { chainId };

  if (assetPart.startsWith("erc20:")) {
    const tokenAddress = assetPart.replace("erc20:", "") as `0x${string}`;
    return { chainId, tokenAddress };
  }

  if (assetPart.startsWith("slip44:")) {
    return { chainId };
  }

  return { chainId };
};

export const useAssetBalance = (
  address: string | undefined,
  assetId: AssetId | undefined,
  precision: number = 18,
) => {
  const parsed = assetId ? parseAssetId(assetId) : null;
  const isNative = parsed && !parsed.tokenAddress;
  const isErc20 = parsed && !!parsed.tokenAddress;

  const { data: nativeBalance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: isNative ? parsed.chainId : undefined,
    query: {
      enabled: !!address && !!isNative,
    },
  });

  const { data: erc20Balance } = useBalance({
    address: address as `0x${string}` | undefined,
    chainId: isErc20 ? parsed.chainId : undefined,
    token: isErc20 ? parsed.tokenAddress : undefined,
    query: {
      enabled: !!address && !!isErc20,
    },
  });

  const balance = isNative ? nativeBalance : isErc20 ? erc20Balance : undefined;

  return useMemo(() => {
    if (!balance || !assetId) {
      return { data: undefined, isLoading: false };
    }

    return {
      data: {
        assetId,
        balance: balance.value.toString(),
        balanceFormatted: formatAmount(balance.value.toString(), precision),
      },
      isLoading: false,
    };
  }, [balance, assetId, precision]);
};

export const useEvmBalances = (
  address: string | undefined,
  assetIds: AssetId[],
  assetPrecisions: Record<AssetId, number>,
) => {
  const config = useConfig();

  const parsedAssets = useMemo(() => {
    return assetIds
      .map((assetId) => {
        const parsed = parseAssetId(assetId);
        if (!parsed) return null;
        return {
          assetId,
          chainId: parsed.chainId,
          tokenAddress: parsed.tokenAddress,
          precision: assetPrecisions[assetId] ?? 18,
          isNative: !parsed.tokenAddress,
        };
      })
      .filter(Boolean) as Array<{
      assetId: AssetId;
      chainId: number;
      tokenAddress?: `0x${string}`;
      precision: number;
      isNative: boolean;
    }>;
  }, [assetIds, assetPrecisions]);

  const nativeAssets = useMemo(
    () => parsedAssets.filter((a) => a.isNative),
    [parsedAssets],
  );

  const erc20Assets = useMemo(
    () => parsedAssets.filter((a) => !a.isNative),
    [parsedAssets],
  );

  const nativeQueries = useQueries({
    queries: nativeAssets.map((asset) => ({
      queryKey: ["nativeBalance", address, asset.chainId],
      queryFn: async () => {
        if (!address) return null;
        try {
          const result = await getBalance(config, {
            address: address as `0x${string}`,
            chainId: asset.chainId,
          });
          return {
            assetId: asset.assetId,
            balance: result.value.toString(),
            precision: asset.precision,
          };
        } catch {
          return null;
        }
      },
      enabled: !!address,
      staleTime: 30_000,
    })),
  });

  const erc20Contracts = useMemo(
    () =>
      erc20Assets.map((asset) => ({
        address: asset.tokenAddress!,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`],
        chainId: asset.chainId,
      })),
    [erc20Assets, address],
  );

  const { data: erc20Results, isLoading: isErc20Loading } = useReadContracts({
    contracts: erc20Contracts,
    query: {
      enabled: !!address && erc20Contracts.length > 0,
    },
  });

  const balances = useMemo((): BalancesMap => {
    const result: BalancesMap = {};

    nativeQueries.forEach((query) => {
      if (query.data) {
        const { assetId, balance, precision } = query.data;
        result[assetId] = {
          assetId,
          balance,
          balanceFormatted: formatAmount(balance, precision),
        };
      }
    });

    if (erc20Results) {
      erc20Assets.forEach((asset, index) => {
        const balanceResult = erc20Results[index];
        if (balanceResult?.status === "success" && balanceResult.result) {
          const balance = (balanceResult.result as bigint).toString();
          result[asset.assetId] = {
            assetId: asset.assetId,
            balance,
            balanceFormatted: formatAmount(balance, asset.precision),
          };
        }
      });
    }

    return result;
  }, [nativeQueries, erc20Results, erc20Assets]);

  const isLoading = nativeQueries.some((q) => q.isLoading) || isErc20Loading;

  const loadingAssetIds = useMemo(() => {
    const loading = new Set<AssetId>();
    nativeQueries.forEach((query, index) => {
      if (query.isLoading) {
        loading.add(nativeAssets[index].assetId);
      }
    });
    if (isErc20Loading) {
      erc20Assets.forEach((asset) => {
        loading.add(asset.assetId);
      });
    }
    return loading;
  }, [nativeQueries, nativeAssets, isErc20Loading, erc20Assets]);

  return { data: balances, isLoading, loadingAssetIds };
};
