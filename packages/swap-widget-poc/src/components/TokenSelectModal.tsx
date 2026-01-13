import { useState, useMemo, useCallback, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import type { Asset, AssetId, ChainId } from "../types";
import { useAssets, useChains, type ChainInfo } from "../hooks/useAssets";
import { useEvmBalances } from "../hooks/useBalances";
import { useAllMarketData } from "../hooks/useMarketData";
import "./TokenSelectModal.css";

const VISIBLE_BUFFER = 10;

const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
};

type TokenSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  disabledAssetIds?: string[];
  disabledChainIds?: ChainId[];
  walletAddress?: string;
};

const isNativeAsset = (assetId: string): boolean => {
  return assetId.includes("/slip44:") || assetId.endsWith("/native");
};

const scoreAsset = (asset: Asset, query: string): number => {
  const lowerQuery = query.toLowerCase();
  const symbolLower = asset.symbol.toLowerCase();
  const nameLower = asset.name.toLowerCase();

  let score = 0;

  if (symbolLower === lowerQuery) score += 1000;
  else if (symbolLower.startsWith(lowerQuery)) score += 500;
  else if (symbolLower.includes(lowerQuery)) score += 100;

  if (nameLower === lowerQuery) score += 800;
  else if (nameLower.startsWith(lowerQuery)) score += 300;
  else if (nameLower.includes(lowerQuery)) score += 50;

  if (isNativeAsset(asset.assetId)) score += 200;

  return score;
};

export const TokenSelectModal = ({
  isOpen,
  onClose,
  onSelect,
  disabledAssetIds = [],
  disabledChainIds = [],
  walletAddress,
}: TokenSelectModalProps) => {
  useLockBodyScroll(isOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null);
  const [visibleRange, setVisibleRange] = useState({
    startIndex: 0,
    endIndex: 20,
  });

  const { data: allAssets, isLoading: isLoadingAssets } = useAssets();
  const { data: chains, isLoading: isLoadingChains } = useChains();

  const chainInfoMap = useMemo(() => {
    const map = new Map<ChainId, ChainInfo>();
    for (const chain of chains) {
      map.set(chain.chainId, chain);
    }
    return map;
  }, [chains]);

  const filteredChains = useMemo(() => {
    const enabledChains = chains.filter(
      (chain) => !disabledChainIds.includes(chain.chainId),
    );

    if (!chainSearchQuery.trim()) return enabledChains;

    const lowerQuery = chainSearchQuery.toLowerCase();
    return enabledChains.filter((chain) =>
      chain.name.toLowerCase().includes(lowerQuery),
    );
  }, [chains, chainSearchQuery, disabledChainIds]);

  const filteredAssets = useMemo(() => {
    let assets = allAssets.filter(
      (asset) =>
        !disabledAssetIds.includes(asset.assetId) &&
        !disabledChainIds.includes(asset.chainId),
    );

    if (selectedChainId) {
      assets = assets.filter((asset) => asset.chainId === selectedChainId);
    }

    if (!searchQuery.trim()) {
      const natives = assets.filter((a) => isNativeAsset(a.assetId));
      const others = assets
        .filter((a) => !isNativeAsset(a.assetId))
        .slice(0, Math.max(50 - natives.length, 30));
      return [...natives, ...others];
    }

    const lowerQuery = searchQuery.toLowerCase();
    return assets
      .filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(lowerQuery) ||
          asset.name.toLowerCase().includes(lowerQuery) ||
          asset.assetId.toLowerCase().includes(lowerQuery),
      )
      .map((asset) => ({ asset, score: scoreAsset(asset, searchQuery) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((item) => item.asset);
  }, [
    allAssets,
    selectedChainId,
    searchQuery,
    disabledAssetIds,
    disabledChainIds,
  ]);

  const visibleAssets = useMemo(() => {
    const start = Math.max(0, visibleRange.startIndex - VISIBLE_BUFFER);
    const end = Math.min(
      filteredAssets.length,
      visibleRange.endIndex + VISIBLE_BUFFER,
    );
    return filteredAssets.slice(start, end);
  }, [filteredAssets, visibleRange]);

  const assetPrecisions = useMemo(() => {
    const precisions: Record<AssetId, number> = {};
    for (const asset of visibleAssets) {
      precisions[asset.assetId] = asset.precision;
    }
    return precisions;
  }, [visibleAssets]);

  const assetIds = useMemo(
    () => visibleAssets.map((a) => a.assetId),
    [visibleAssets],
  );

  const { data: balances, loadingAssetIds } = useEvmBalances(
    walletAddress,
    assetIds,
    assetPrecisions,
  );

  const { data: marketData } = useAllMarketData();

  const handleAssetSelect = useCallback(
    (asset: Asset) => {
      onSelect(asset);
      onClose();
      setSearchQuery("");
      setSelectedChainId(null);
    },
    [onSelect, onClose],
  );

  const handleChainSelect = useCallback((chainId: ChainId | null) => {
    setSelectedChainId(chainId);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const isLoading = isLoadingAssets || isLoadingChains;

  return (
    <div className="ssw-modal-backdrop" onClick={handleBackdropClick}>
      <div className="ssw-modal">
        <div className="ssw-modal-header">
          <h2 className="ssw-modal-title">Select Token</h2>
          <button className="ssw-modal-close" onClick={onClose} type="button">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="ssw-modal-content">
          <div className="ssw-chain-sidebar">
            <div className="ssw-search-wrapper">
              <svg
                className="ssw-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="ssw-chain-search"
                placeholder="Search chains"
                value={chainSearchQuery}
                onChange={(e) => setChainSearchQuery(e.target.value)}
              />
            </div>

            <div className="ssw-chain-list">
              <button
                className={`ssw-chain-item ${
                  selectedChainId === null ? "ssw-selected" : ""
                }`}
                onClick={() => handleChainSelect(null)}
                type="button"
              >
                <div className="ssw-chain-icon-multi">
                  <span>🔗</span>
                </div>
                <span className="ssw-chain-name">All Chains</span>
              </button>

              {filteredChains.map((chain) => (
                <button
                  key={chain.chainId}
                  className={`ssw-chain-item ${
                    selectedChainId === chain.chainId ? "ssw-selected" : ""
                  }`}
                  onClick={() => handleChainSelect(chain.chainId)}
                  type="button"
                >
                  {chain.icon ? (
                    <img
                      src={chain.icon}
                      alt={chain.name}
                      className="ssw-chain-icon"
                    />
                  ) : (
                    <div
                      className="ssw-chain-icon-placeholder"
                      style={{ backgroundColor: chain.color ?? "#888" }}
                    >
                      {chain.name.charAt(0)}
                    </div>
                  )}
                  <span className="ssw-chain-name">{chain.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ssw-token-panel">
            <div className="ssw-search-wrapper">
              <svg
                className="ssw-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="ssw-token-search"
                placeholder="Search for a token or paste address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="ssw-token-list">
              {isLoading ? (
                <div className="ssw-loading">
                  <div className="ssw-spinner" />
                  <span>Loading assets...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="ssw-empty">No tokens found</div>
              ) : (
                <Virtuoso
                  data={filteredAssets}
                  rangeChanged={setVisibleRange}
                  overscan={200}
                  itemContent={(_, asset) => {
                    const chainInfo = chainInfoMap.get(asset.chainId);
                    const balance = balances?.[asset.assetId];
                    return (
                      <button
                        className="ssw-token-item"
                        onClick={() => handleAssetSelect(asset)}
                        type="button"
                      >
                        <div className="ssw-token-icon-wrapper">
                          {asset.icon ? (
                            <img
                              src={asset.icon}
                              alt={asset.symbol}
                              className="ssw-token-icon"
                            />
                          ) : (
                            <div
                              className="ssw-token-icon-placeholder"
                              style={{ backgroundColor: asset.color ?? "#888" }}
                            >
                              {asset.symbol?.charAt(0) ?? "?"}
                            </div>
                          )}
                          {chainInfo?.icon && (
                            <img
                              src={chainInfo.icon}
                              alt={chainInfo.name}
                              className="ssw-token-chain-badge"
                            />
                          )}
                        </div>
                        <div className="ssw-token-info">
                          <span className="ssw-token-symbol">
                            {asset.symbol}
                          </span>
                          <span className="ssw-token-name">
                            {chainInfo?.name ?? asset.networkName ?? asset.name}
                          </span>
                        </div>
                        <div className="ssw-token-right">
                          {walletAddress &&
                            (loadingAssetIds.has(asset.assetId) ? (
                              <span className="ssw-token-balance-skeleton" />
                            ) : balance && balance.balance !== "0" ? (
                              <>
                                {marketData?.[asset.assetId]?.price && (
                                  <span className="ssw-token-fiat-value">
                                    $
                                    {(
                                      (Number(balance.balance) /
                                        Math.pow(10, asset.precision)) *
                                      Number(marketData[asset.assetId].price)
                                    ).toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                )}
                                <span className="ssw-token-balance">
                                  {balance.balanceFormatted}
                                </span>
                              </>
                            ) : null)}
                        </div>
                      </button>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
