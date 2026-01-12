import "./QuotesModal.css";

import { useCallback, useEffect, useMemo } from "react";

import { getSwapperColor, getSwapperIcon } from "../constants/swappers";
import { formatUsdValue } from "../hooks/useMarketData";
import type { Asset, TradeRate } from "../types";
import { formatAmount } from "../types";

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

type QuotesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rates: TradeRate[];
  selectedRate: TradeRate | null;
  onSelectRate: (rate: TradeRate) => void;
  buyAsset: Asset;
  sellAsset: Asset;
  sellAmountBaseUnit: string;
  buyAssetUsdPrice?: string;
};

const calculateSavingsPercent = (
  bestAmount: string,
  currentAmount: string,
): string | null => {
  const best = parseFloat(bestAmount || "0");
  const current = parseFloat(currentAmount || "0");
  if (best === 0) return null;
  const diff = ((best - current) / best) * 100;
  return diff > 0.1 ? diff.toFixed(2) : null;
};

export const QuotesModal = ({
  isOpen,
  onClose,
  rates,
  selectedRate,
  onSelectRate,
  buyAsset,
  sellAsset,
  sellAmountBaseUnit,
  buyAssetUsdPrice,
}: QuotesModalProps) => {
  useLockBodyScroll(isOpen);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      onSelectRate(rate);
      onClose();
    },
    [onSelectRate, onClose],
  );

  const sortedRates = useMemo(() => {
    return [...rates]
      .filter((r) => !r.error && r.buyAmountCryptoBaseUnit !== "0")
      .sort((a, b) => {
        const aAmount = parseFloat(a.buyAmountCryptoBaseUnit || "0");
        const bAmount = parseFloat(b.buyAmountCryptoBaseUnit || "0");
        return bAmount - aAmount;
      });
  }, [rates]);

  const bestRate = useMemo(() => sortedRates[0], [sortedRates]);
  const bestBuyAmount = bestRate?.buyAmountCryptoBaseUnit ?? "0";

  if (!isOpen) return null;

  return (
    <div className="ssw-quotes-modal-backdrop" onClick={handleBackdropClick}>
      <div className="ssw-quotes-modal">
        <div className="ssw-quotes-modal-header">
          <div className="ssw-quotes-header-content">
            <h2 className="ssw-quotes-modal-title">Select Route</h2>
            <span className="ssw-quotes-modal-subtitle">
              {formatAmount(sellAmountBaseUnit, sellAsset.precision)}{" "}
              {sellAsset.symbol} → {buyAsset.symbol}
            </span>
          </div>
          <button
            className="ssw-quotes-modal-close"
            onClick={onClose}
            type="button"
          >
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

        <div className="ssw-quotes-modal-list">
          {sortedRates.map((rate, index) => {
            const buyAmount = rate.buyAmountCryptoBaseUnit ?? "0";
            const estimatedTime = rate.estimatedExecutionTimeMs;
            const isBest = index === 0;
            const isSelected = selectedRate?.id === rate.id;
            const swapperIcon = getSwapperIcon(rate.swapperName);
            const swapperColor = getSwapperColor(rate.swapperName);
            const formattedBuyAmount = formatAmount(
              buyAmount,
              buyAsset.precision,
            );
            const usdValue = formatUsdValue(
              buyAmount,
              buyAsset.precision,
              buyAssetUsdPrice,
            );
            const savingsPercent = isBest
              ? null
              : calculateSavingsPercent(bestBuyAmount, buyAmount);
            const estimatedSeconds = estimatedTime
              ? Math.round(estimatedTime / 1000)
              : 0;
            const hasTime = estimatedSeconds > 0;

            return (
              <button
                key={rate.id}
                className={`ssw-quote-row ${isSelected ? "ssw-selected" : ""} ${
                  isBest ? "ssw-best" : ""
                }`}
                onClick={() => handleSelectRate(rate)}
                type="button"
              >
                <div className="ssw-quote-row-left">
                  {swapperIcon ? (
                    <img
                      src={swapperIcon}
                      alt={rate.swapperName}
                      className="ssw-quote-row-icon"
                    />
                  ) : (
                    <div
                      className="ssw-quote-row-icon-placeholder"
                      style={{ backgroundColor: swapperColor }}
                    >
                      {rate.swapperName.charAt(0)}
                    </div>
                  )}
                  <div className="ssw-quote-row-info">
                    <div className="ssw-quote-row-name-row">
                      <span className="ssw-quote-row-name">
                        {rate.swapperName}
                      </span>
                      {isBest && (
                        <span className="ssw-quote-row-best">Best</span>
                      )}
                      {savingsPercent && (
                        <span className="ssw-quote-row-diff">
                          -{savingsPercent}%
                        </span>
                      )}
                    </div>
                    {hasTime && (
                      <span className="ssw-quote-row-time">
                        ~{estimatedSeconds}s
                      </span>
                    )}
                  </div>
                </div>

                <div className="ssw-quote-row-right">
                  <span className="ssw-quote-row-amount">
                    {formattedBuyAmount}{" "}
                    <span className="ssw-quote-row-symbol">
                      {buyAsset.symbol}
                    </span>
                  </span>
                  <span className="ssw-quote-row-usd">{usdValue}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
