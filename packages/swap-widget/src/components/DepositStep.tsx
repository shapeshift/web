import { useCallback, useEffect, useState } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { formatAmount, truncateAddress } from '../types'
import { formatCountdown } from '../utils/countdown'
import { QrCode } from './QrCode'

export const DepositStep = () => {
  // Addresses come from the machine, which froze them at quote time - a wallet connecting
  // mid-payment must not repaint the screen with addresses the channel doesn't know
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isExpired = SwapMachineCtx.useSelector(s => s.matches('deposit_expired'))
  const actorRef = SwapMachineCtx.useActorRef()

  const { quote, sendAddress, receiveAddress } = context

  const [msRemaining, setMsRemaining] = useState(() => (quote ? quote.expiresAt - Date.now() : 0))
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    if (!quote || isExpired) return

    const tick = () => {
      const remaining = quote.expiresAt - Date.now()
      setMsRemaining(remaining)
      if (remaining <= 0) actorRef.send({ type: 'DEPOSIT_EXPIRED' })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [quote, isExpired, actorRef])

  const handleCopy = useCallback(() => {
    if (!quote?.depositAddress) return
    navigator.clipboard.writeText(quote.depositAddress).then(() => {
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    })
  }, [quote?.depositAddress])

  const handleNewSwap = useCallback(() => actorRef.send({ type: 'RESET' }), [actorRef])
  const handleNewAddress = useCallback(() => actorRef.send({ type: 'RETRY' }), [actorRef])

  if (!quote?.depositAddress) return null

  const sellAmount = formatAmount(quote.sellAmountCryptoBaseUnit, quote.sellAsset.precision)
  const buyAmount = formatAmount(quote.buyAmountAfterFeesCryptoBaseUnit, quote.buyAsset.precision)

  if (isExpired) {
    return (
      <div className='ssw-deposit'>
        <span className='ssw-deposit-expired'>
          This deposit address has expired - don't send funds to it.
        </span>
        <button className='ssw-action-btn' onClick={handleNewAddress} type='button'>
          Get a new deposit address
        </button>
        <button className='ssw-action-btn ssw-secondary' onClick={handleNewSwap} type='button'>
          New swap
        </button>
      </div>
    )
  }

  return (
    <div className='ssw-deposit'>
      <span className='ssw-deposit-title'>
        Send exactly {sellAmount} {quote.sellAsset.symbol}
      </span>

      <QrCode value={quote.depositAddress} />

      <button className='ssw-deposit-address' onClick={handleCopy} type='button'>
        <span>{truncateAddress(quote.depositAddress, 8)}</span>
        <span className='ssw-deposit-copy'>{hasCopied ? 'Copied' : 'Copy'}</span>
      </button>

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
