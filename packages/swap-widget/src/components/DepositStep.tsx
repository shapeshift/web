import { useCallback, useEffect, useState } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { formatAmount, formatAmountForInput, truncateAddress } from '../types'
import { formatCountdown } from '../utils/countdown'
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
  // Addresses come from the machine, which froze them at quote time - a wallet connecting
  // mid-payment must not repaint the screen with addresses the channel doesn't know
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isExpired = SwapMachineCtx.useSelector(s => s.matches('deposit_expired'))
  const isRequoting = SwapMachineCtx.useSelector(s => s.matches('quoting'))
  const actorRef = SwapMachineCtx.useActorRef()

  const { quote, sendAddress, receiveAddress } = context

  const [msRemaining, setMsRemaining] = useState(() => (quote ? quote.expiresAt - Date.now() : 0))

  useEffect(() => {
    if (!quote || isExpired || isRequoting) return

    const tick = () => {
      const remaining = quote.expiresAt - Date.now()
      setMsRemaining(remaining)
      if (remaining <= 0) actorRef.send({ type: 'DEPOSIT_EXPIRED' })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [quote, isExpired, isRequoting, actorRef])

  const handleNewSwap = useCallback(() => actorRef.send({ type: 'RESET' }), [actorRef])
  const handleNewAddress = useCallback(() => actorRef.send({ type: 'RETRY' }), [actorRef])

  if (!quote?.depositAddress) return null

  // Ungrouped and unrounded - a rounded amount would contradict "send exactly", and it's what
  // the user pastes into their wallet
  const sellAmount = formatAmountForInput(quote.sellAmountCryptoBaseUnit, quote.sellAsset.precision)
  const buyAmount = formatAmount(quote.buyAmountAfterFeesCryptoBaseUnit, quote.buyAsset.precision)

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
        <div className='ssw-step-title'>Getting a New Address</div>
        <div className='ssw-step-subtitle'>Don't send to the previous address</div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className='ssw-step-screen'>
        <div className='ssw-step-icon-circle ssw-ic-warning'>
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
        <div className='ssw-step-title'>Deposit Window Closed</div>
        <div className='ssw-step-subtitle'>
          Don't send to the previous address. A new one comes with an updated quote.
        </div>
        <div className='ssw-step-actions'>
          <button className='ssw-action-btn' onClick={handleNewAddress} type='button'>
            Get a New Address
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
      <span className='ssw-deposit-title'>Send from any wallet</span>

      <QrCode value={quote.depositAddress} />

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
        New swap
      </button>
    </div>
  )
}
