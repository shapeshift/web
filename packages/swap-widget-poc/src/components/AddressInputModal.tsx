import { useState, useCallback, useEffect, useMemo } from "react";
import type { ChainId } from "../types";
import {
  validateAddress,
  getAddressFormatHint,
} from "../utils/addressValidation";
import "./AddressInputModal.css";

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

type AddressInputModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chainId: ChainId;
  chainName: string;
  currentAddress: string;
  onAddressChange: (address: string) => void;
  walletAddress?: string;
};

export const AddressInputModal = ({
  isOpen,
  onClose,
  chainId,
  chainName,
  currentAddress,
  onAddressChange,
  walletAddress,
}: AddressInputModalProps) => {
  useLockBodyScroll(isOpen);
  const [inputValue, setInputValue] = useState(currentAddress);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentAddress);
      setHasInteracted(false);
    }
  }, [isOpen, currentAddress]);

  const validation = useMemo(() => {
    if (!inputValue || !hasInteracted) {
      return { valid: true, error: undefined };
    }
    return validateAddress(inputValue, chainId);
  }, [inputValue, chainId, hasInteracted]);

  const formatHint = useMemo(() => getAddressFormatHint(chainId), [chainId]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setHasInteracted(true);
  }, []);

  const handleUseWalletAddress = useCallback(() => {
    if (walletAddress) {
      setInputValue(walletAddress);
      setHasInteracted(true);
    }
  }, [walletAddress]);

  const handleConfirm = useCallback(() => {
    const result = validateAddress(inputValue, chainId);
    if (result.valid) {
      onAddressChange(inputValue);
      onClose();
    }
  }, [inputValue, chainId, onAddressChange, onClose]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setHasInteracted(false);
    onAddressChange("");
    onClose();
  }, [onAddressChange, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const isConfirmDisabled = useMemo(() => {
    if (!inputValue) return true;
    return !validateAddress(inputValue, chainId).valid;
  }, [inputValue, chainId]);

  if (!isOpen) return null;

  return (
    <div className="ssw-modal-backdrop" onClick={handleBackdropClick}>
      <div className="ssw-address-modal">
        <div className="ssw-modal-header">
          <h2 className="ssw-modal-title">Receive Address</h2>
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

        <div className="ssw-address-content">
          <div className="ssw-address-label">
            <span>Enter {chainName} address</span>
          </div>

          <div
            className={`ssw-address-input-wrapper ${
              !validation.valid && hasInteracted ? "ssw-invalid" : ""
            }`}
          >
            <input
              type="text"
              className="ssw-address-input"
              placeholder={formatHint}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            {inputValue && (
              <button
                className="ssw-address-clear-btn"
                onClick={() => {
                  setInputValue("");
                  setHasInteracted(false);
                }}
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {!validation.valid && hasInteracted && validation.error && (
            <div className="ssw-address-error">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{validation.error}</span>
            </div>
          )}

          {walletAddress && (
            <button
              className="ssw-use-wallet-btn"
              onClick={handleUseWalletAddress}
              type="button"
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
              <span>Use connected wallet</span>
            </button>
          )}

          <div className="ssw-address-actions">
            <button
              className="ssw-address-btn ssw-address-btn-secondary"
              onClick={handleClear}
              type="button"
            >
              Reset to Wallet
            </button>
            <button
              className="ssw-address-btn ssw-address-btn-primary"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              type="button"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
