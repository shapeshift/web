import { useState, useCallback } from "react";
import "./SettingsModal.css";

const SLIPPAGE_PRESETS = ["0.1", "0.5", "1.0"];

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slippage: string;
  onSlippageChange: (slippage: string) => void;
};

export const SettingsModal = ({
  isOpen,
  onClose,
  slippage,
  onSlippageChange,
}: SettingsModalProps) => {
  const [customSlippage, setCustomSlippage] = useState("");
  const [isCustom, setIsCustom] = useState(
    !SLIPPAGE_PRESETS.includes(slippage),
  );

  const handlePresetClick = useCallback(
    (preset: string) => {
      setIsCustom(false);
      setCustomSlippage("");
      onSlippageChange(preset);
    },
    [onSlippageChange],
  );

  const handleCustomChange = useCallback(
    (value: string) => {
      const sanitized = value.replace(/[^0-9.]/g, "");
      const parts = sanitized.split(".");
      const formatted =
        parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : sanitized;

      setCustomSlippage(formatted);
      setIsCustom(true);

      const numValue = parseFloat(formatted);
      if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
        onSlippageChange(formatted);
      }
    },
    [onSlippageChange],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const currentSlippageNum = parseFloat(slippage);
  const isHighSlippage = currentSlippageNum > 1;
  const isVeryHighSlippage = currentSlippageNum > 5;

  return (
    <div className="ssw-modal-backdrop" onClick={handleBackdropClick}>
      <div className="ssw-settings-modal">
        <div className="ssw-modal-header">
          <h2 className="ssw-modal-title">Settings</h2>
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

        <div className="ssw-settings-content">
          <div className="ssw-settings-section">
            <div className="ssw-settings-label">
              <span>Slippage Tolerance</span>
              <button
                className="ssw-info-btn"
                type="button"
                title="Maximum price difference you're willing to accept"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </button>
            </div>

            <div className="ssw-slippage-options">
              {SLIPPAGE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`ssw-slippage-btn ${
                    !isCustom && slippage === preset ? "ssw-selected" : ""
                  }`}
                  onClick={() => handlePresetClick(preset)}
                  type="button"
                >
                  {preset}%
                </button>
              ))}
              <div
                className={`ssw-slippage-custom ${
                  isCustom ? "ssw-selected" : ""
                }`}
              >
                <input
                  type="text"
                  placeholder="Custom"
                  value={isCustom ? customSlippage || slippage : ""}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  onFocus={() => {
                    setIsCustom(true);
                    if (!customSlippage) setCustomSlippage(slippage);
                  }}
                />
                <span className="ssw-slippage-suffix">%</span>
              </div>
            </div>

            {isHighSlippage && (
              <div
                className={`ssw-slippage-warning ${
                  isVeryHighSlippage ? "ssw-error" : ""
                }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                </svg>
                <span>
                  {isVeryHighSlippage
                    ? "Very high slippage. Your transaction may be frontrun."
                    : "High slippage may result in unfavorable rates."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
