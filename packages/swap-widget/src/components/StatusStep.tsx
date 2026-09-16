import { useMemo } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'

const ExplorerLink = ({ url, label }: { url: string; label: string }) => (
  <a href={url} target='_blank' rel='noopener noreferrer' className='ssw-step-explorer-link'>
    {label}
    <svg
      width='12'
      height='12'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3' />
    </svg>
  </a>
)

type TxLink = { url: string | null | undefined; label: string }

const TxLinks = ({ links }: { links: TxLink[] }) => {
  const available = links.filter((link): link is { url: string; label: string } => !!link.url)
  if (!available.length) return null

  return (
    <div className='ssw-step-explorer-links'>
      {available.map(({ url, label }) => (
        <ExplorerLink key={label} url={url} label={label} />
      ))}
    </div>
  )
}

type StatusStepProps = {
  isPayment: boolean
}

export const StatusStep = ({ isPayment }: StatusStepProps) => {
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isPolling = SwapMachineCtx.useSelector(s => s.matches('polling_status'))
  const isComplete = SwapMachineCtx.useSelector(s => s.matches('complete'))
  const isError = SwapMachineCtx.useSelector(s => s.matches('error'))
  const { send } = SwapMachineCtx.useActorRef()
  const {
    sellAsset,
    buyAsset,
    quote,
    txHash,
    txLink,
    buyTxLink,
    swapperTxLink,
    error,
    errorSource,
    retryCount,
    isSellAssetUtxo,
    isSellAssetSolana,
    isDepositFlow,
  } = context

  // Names the leg, so it pairs with the buy link where both are shown
  const explorerLabel = isDepositFlow ? 'View deposit' : 'View sent'

  // The swap may well have settled, so no failure wording and no retry quoting a second one
  const hasStoppedTracking = errorSource === 'TRACKING_TIMEOUT'

  const explorerUrl = useMemo(() => {
    if (!txHash) return undefined
    if (isSellAssetUtxo) return `https://mempool.space/tx/${txHash}`
    if (isSellAssetSolana) return `https://solscan.io/tx/${txHash}`
    return `${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${txHash}`
  }, [txHash, isSellAssetUtxo, isSellAssetSolana, sellAsset.explorerTxLink])

  const sellTxLink: TxLink = { url: txLink ?? explorerUrl, label: explorerLabel }
  const swapperLink: TxLink = {
    url: swapperTxLink,
    label: quote?.swapperName ? `View on ${quote.swapperName}` : 'View swap details',
  }

  // The swapper's own page already covers both legs, so the chain links are only a fallback
  const settledTxLinks = swapperTxLink
    ? [swapperLink]
    : [sellTxLink, { url: buyTxLink, label: 'View received' }]
  const unsettledTxLinks = swapperTxLink ? [swapperLink] : [sellTxLink]

  const truncatedError = useMemo(
    () => (error && error.length > 100 ? `${error.slice(0, 100)}…` : error),
    [error],
  )

  return (
    <div className='ssw-step-screen'>
      {isPolling && (
        <>
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
          <div className='ssw-step-title'>
            {isDepositFlow ? 'Swap in Progress' : 'Confirming Transaction'}
          </div>
          <div className='ssw-step-subtitle'>
            {isDepositFlow
              ? `Deposit received. Waiting for ${
                  quote?.swapperName ?? 'the provider'
                } to send your ${buyAsset.symbol}.`
              : 'Your swap is being processed…'}
          </div>
          <TxLinks links={[sellTxLink, swapperLink]} />
          {isDepositFlow && !isPayment && (
            <div className='ssw-step-actions'>
              <button
                className='ssw-action-btn ssw-secondary'
                onClick={() => send({ type: 'RESET' })}
                type='button'
              >
                New Swap
              </button>
            </div>
          )}
        </>
      )}

      {isComplete && (
        <>
          <div className='ssw-step-icon-circle ssw-ic-success'>
            <svg
              width='32'
              height='32'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
            >
              <path d='M20 6L9 17l-5-5' />
            </svg>
          </div>
          <div className='ssw-step-title'>Swap Complete!</div>
          <div className='ssw-step-subtitle'>
            Swapped {sellAsset.symbol} for {buyAsset.symbol}
          </div>
          <TxLinks links={settledTxLinks} />
          {!isPayment && (
            <div className='ssw-step-actions'>
              <button
                className='ssw-action-btn'
                onClick={() => send({ type: 'RESET' })}
                type='button'
              >
                New Swap
              </button>
            </div>
          )}
        </>
      )}

      {isError && (
        <>
          <div
            className={`ssw-step-icon-circle ${
              hasStoppedTracking ? 'ssw-ic-accent' : 'ssw-ic-error'
            }`}
          >
            <svg
              width='32'
              height='32'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='10' />
              <path d={hasStoppedTracking ? 'M12 7v5l3 2' : 'M15 9l-6 6M9 9l6 6'} />
            </svg>
          </div>
          <div className='ssw-step-title'>
            {hasStoppedTracking ? 'Still Processing' : 'Swap Failed'}
          </div>
          <div className='ssw-step-subtitle'>{truncatedError ?? 'Something went wrong'}</div>
          <TxLinks links={unsettledTxLinks} />
          <div className='ssw-step-actions'>
            {!hasStoppedTracking && retryCount < 3 && (
              <button
                className='ssw-action-btn'
                onClick={() => send({ type: 'RETRY' })}
                type='button'
              >
                Retry
              </button>
            )}
            <button
              className='ssw-action-btn ssw-secondary'
              onClick={() => send({ type: 'RESET' })}
              type='button'
            >
              New Swap
            </button>
          </div>
        </>
      )}
    </div>
  )
}
