import { buildPaymentUri } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useId, useState } from 'react'

import { getChainIcon } from '../constants/chains'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { formatAmount, formatAmountForInput, truncateAddress } from '../types'
import { formatCountdown } from '../utils/countdown'
import { shouldKeepTrackingDeposit } from '../utils/depositStatus'
import { QrCode } from './QrCode'

type CopyFieldProps = {
  label: string
  display: string
  value: string
}

const CopyField = ({ label, display, value }: CopyFieldProps) => {
  const [hasCopied, setHasCopied] = useState(false)

  // Absent on insecure origins, where the value stays selectable rather than copyable
  const handleCopy = useCallback(() => {
    if (!navigator.clipboard) return
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setHasCopied(true)
        setTimeout(() => setHasCopied(false), 2000)
      })
      .catch(() => {})
  }, [value])

  return (
    <div className='ssw-deposit-field'>
      <span className='ssw-deposit-field-label'>{label}</span>
      <button
        className='ssw-deposit-value'
        onClick={handleCopy}
        type='button'
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <span>{display}</span>
        <span className='ssw-deposit-copy'>{hasCopied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}

export const DepositStep = () => {
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isExpired = SwapMachineCtx.useSelector(s => s.matches('deposit_expired'))
  const isRequoting = SwapMachineCtx.useSelector(s => s.matches('quoting'))
  const actorRef = SwapMachineCtx.useActorRef()

  const { quote, sendAddress, receiveAddress } = context

  const [msRemaining, setMsRemaining] = useState(() => (quote ? quote.expiresAt - Date.now() : 0))

  // The bare address scans in every wallet tested; many built-in scanners misread payment URIs
  const [isAmountInQr, setIsAmountInQr] = useState(false)
  const [isQrInfoOpen, setIsQrInfoOpen] = useState(false)
  const qrInfoId = useId()

  // Keeps ticking past expiry so the screen knows when the tracking window closes too
  useEffect(() => {
    if (!quote || isRequoting) return

    const tick = () => {
      const remaining = quote.expiresAt - Date.now()
      setMsRemaining(remaining)
      if (remaining <= 0 && !isExpired) actorRef.send({ type: 'DEPOSIT_EXPIRED' })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [quote, isExpired, isRequoting, actorRef])

  const handleNewSwap = useCallback(() => actorRef.send({ type: 'RESET' }), [actorRef])
  const handleNewQuote = useCallback(() => actorRef.send({ type: 'RETRY' }), [actorRef])
  const handleShowAddressOnly = useCallback(() => setIsAmountInQr(false), [])
  const handleShowWithAmount = useCallback(() => setIsAmountInQr(true), [])
  const handleToggleQrInfo = useCallback(() => setIsQrInfoOpen(isOpen => !isOpen), [])
  const handleCloseQrInfo = useCallback(() => setIsQrInfoOpen(false), [])

  if (!quote?.depositAddress) return null

  // Polling continues this long after expiry, so a deposit already sent still resolves here
  const isStillWatching = shouldKeepTrackingDeposit({
    quoteDeadline: quote.expiresAt,
    depositObservedAt: undefined,
    now: quote.expiresAt - msRemaining,
  })

  // Ungrouped and unrounded - it's pasted into a wallet, and "send exactly" must mean it
  const sellAmount = formatAmountForInput(quote.sellAmountCryptoBaseUnit, quote.sellAsset.precision)
  const buyAmount = formatAmount(quote.buyAmountAfterFeesCryptoBaseUnit, quote.buyAsset.precision)

  const paymentUri = buildPaymentUri({
    address: quote.depositAddress,
    asset: quote.sellAsset,
    amountCryptoPrecision: sellAmount,
  })

  // A chain with no adopted payment scheme already encodes the bare address
  const canIncludeAmount = paymentUri !== quote.depositAddress

  if (isRequoting) {
    return (
      <div className='ssw-step-screen'>
        <div className='ssw-step-icon-circle ssw-ic-accent'>
          <svg
            className='ssw-spinner'
            width='32'
            height='32'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='12' cy='12' r='10' opacity='0.25' />
            <path d='M12 2a10 10 0 0 1 10 10' />
          </svg>
        </div>
        <div className='ssw-step-title'>Requesting New Quote</div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className='ssw-step-screen'>
        <div className='ssw-step-icon-circle ssw-ic-error'>
          <svg
            width='32'
            height='32'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='12' cy='12' r='10' />
            <path d='M12 7v5l3 2' />
          </svg>
        </div>
        <div className='ssw-step-title'>Quote Expired</div>
        <div className='ssw-step-subtitle'>
          Don't send to the previous address. Request a new quote to continue.
        </div>
        <div className='ssw-deposit-watching'>
          {isStillWatching ? (
            <>
              <svg
                className='ssw-spinner'
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' opacity='0.25' />
                <path d='M12 2a10 10 0 0 1 10 10' />
              </svg>
              <span>Already sent? Still watching for your deposit - this screen will update.</span>
            </>
          ) : (
            <span>
              Already sent? The provider may still settle or refund it - check your receive and
              refund addresses.
            </span>
          )}
        </div>
        <div className='ssw-step-actions'>
          <button className='ssw-action-btn' onClick={handleNewQuote} type='button'>
            Request New Quote
          </button>
          <button className='ssw-action-btn ssw-secondary' onClick={handleNewSwap} type='button'>
            New Swap
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='ssw-deposit'>
      <span className='ssw-deposit-title'>Awaiting Deposit</span>

      <QrCode
        value={canIncludeAmount && isAmountInQr ? paymentUri : quote.depositAddress}
        logo={getChainIcon(quote.sellAsset.chainId)}
      />

      {canIncludeAmount && (
        <div className='ssw-deposit-qr-controls'>
          <div className='ssw-deposit-qr-mode' role='group' aria-label='QR code contents'>
            <button type='button' aria-pressed={!isAmountInQr} onClick={handleShowAddressOnly}>
              Address only
            </button>
            <button type='button' aria-pressed={isAmountInQr} onClick={handleShowWithAmount}>
              With amount
            </button>
          </div>
          <button
            type='button'
            className='ssw-deposit-qr-info'
            aria-label='About the QR code options'
            aria-describedby={qrInfoId}
            aria-expanded={isQrInfoOpen}
            onClick={handleToggleQrInfo}
            onBlur={handleCloseQrInfo}
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 16v-4M12 8h.01' />
            </svg>
          </button>
          <span
            id={qrInfoId}
            role='tooltip'
            className={`ssw-deposit-qr-tooltip${isQrInfoOpen ? ' ssw-open' : ''}`}
          >
            <span>
              <strong>Address only:</strong> Enter the exact amount in your wallet.
            </span>
            <span>
              <strong>With amount:</strong> Also fills in the amount, if your wallet supports it.
            </span>
          </span>
        </div>
      )}

      <CopyField
        label='Send exactly'
        display={`${sellAmount} ${quote.sellAsset.symbol}`}
        value={sellAmount}
      />

      <CopyField
        label='To this address'
        display={truncateAddress(quote.depositAddress, 8)}
        value={quote.depositAddress}
      />

      <span className='ssw-deposit-countdown'>Expires in {formatCountdown(msRemaining)}</span>

      <div className='ssw-deposit-summary'>
        <div className='ssw-deposit-row'>
          <span>You get</span>
          <span>
            ~{buyAmount} {quote.buyAsset.symbol}
          </span>
        </div>
        <div className='ssw-deposit-row'>
          <span>Receive address</span>
          <span>{truncateAddress(receiveAddress ?? '', 6)}</span>
        </div>
        <div className='ssw-deposit-row'>
          <span>Refund address</span>
          <span>{truncateAddress(sendAddress ?? '', 6)}</span>
        </div>
      </div>

      <button className='ssw-action-btn ssw-secondary' onClick={handleNewSwap} type='button'>
        New Swap
      </button>
    </div>
  )
}
