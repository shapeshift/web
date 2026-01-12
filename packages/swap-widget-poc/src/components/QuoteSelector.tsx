import { useState, useMemo, useCallback } from "react";
import type { TradeRate, Asset } from "../types";
import { formatAmount } from "../types";
import { getSwapperIcon, getSwapperColor } from "../constants/swappers";
import { QuotesModal } from "./QuotesModal";
import { formatUsdValue } from "../hooks/useMarketData";
import "./QuoteSelector.css";

type QuoteSelectorProps = {
  rates: TradeRate[];
  selectedRate: TradeRate | null;
  onSelectRate: (rate: TradeRate) => void;
  buyAsset: Asset;
  sellAsset: Asset;
  sellAmountBaseUnit: string;
  isLoading: boolean;
  buyAssetUsdPrice?: string;
};

export const QuoteSelector = ({
  rates,
  selectedRate,
  onSelectRate,
  buyAsset,
  sellAsset,
  sellAmountBaseUnit,
  isLoading,
  buyAssetUsdPrice,
}: QuoteSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const bestRate = useMemo(() => rates[0], [rates]);
  const alternativeRatesCount = useMemo(
    () => Math.max(0, rates.length - 1),
    [rates],
  );

  const handleOpenModal = useCallback(() => {
    if (rates.length > 0) {
      setIsModalOpen(true);
    }
  }, [rates.length]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      onSelectRate(rate);
    },
    [onSelectRate],
  );

  if (isLoading) {
    return (
      <div className="ssw-quote-selector ssw-loading">
        <div className="ssw-quote-loading">
          <div className="ssw-spinner-small" />
          <span>Finding best rates...</span>
        </div>
      </div>
    );
  }

  if (!bestRate) {
    return null;
  }

  const displayRate = selectedRate ?? bestRate;
  const buyAmount = displayRate.buyAmountCryptoBaseUnit ?? "0";
  const swapperIcon = getSwapperIcon(displayRate.swapperName);
  const swapperColor = getSwapperColor(displayRate.swapperName);
  const formattedBuyAmount = formatAmount(buyAmount, buyAsset.precision);
  const usdValue = formatUsdValue(
    buyAmount,
    buyAsset.precision,
    buyAssetUsdPrice,
  );

  return (
    <>
      <button
        className="ssw-quote-selector"
        onClick={handleOpenModal}
        type="button"
      >
        <div className="ssw-quote-left">
          <div className="ssw-quote-provider">
            {swapperIcon ? (
              <img
                src={swapperIcon}
                alt={displayRate.swapperName}
                className="ssw-quote-provider-icon"
              />
            ) : (
              <div
                className="ssw-quote-provider-icon-placeholder"
                style={{ backgroundColor: swapperColor }}
              >
                {displayRate.swapperName.charAt(0)}
              </div>
            )}
            <span className="ssw-quote-provider-name">
              {displayRate.swapperName}
            </span>
            {displayRate === bestRate && (
              <span className="ssw-quote-best-tag">Best</span>
            )}
          </div>
          <span className="ssw-quote-usd">{usdValue}</span>
        </div>

        <div className="ssw-quote-right">
          <div className="ssw-quote-amount-row">
            <span className="ssw-quote-amount">{formattedBuyAmount}</span>
            <span className="ssw-quote-symbol">{buyAsset.symbol}</span>
          </div>
          {alternativeRatesCount > 0 && (
            <span className="ssw-quote-more">
              +{alternativeRatesCount} more
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </span>
          )}
        </div>
      </button>

      <QuotesModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        rates={rates}
        selectedRate={selectedRate}
        onSelectRate={handleSelectRate}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmountBaseUnit={sellAmountBaseUnit}
        buyAssetUsdPrice={buyAssetUsdPrice}
      />
    </>
  );
};
