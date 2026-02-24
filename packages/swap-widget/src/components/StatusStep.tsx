import { useMemo } from 'react'

import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type StatusStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  isPolling: boolean
  isComplete: boolean
  isError: boolean
}

const ExplorerLink = ({ url }: { url: string }) => (
  <a href={url} target='_blank' rel='noopener noreferrer' className='ssw-step-explorer-link'>
    View on Explorer
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

export const StatusStep = ({ context, send, isPolling, isComplete, isError }: StatusStepProps) => {
  const { sellAsset, buyAsset, txHash, error, retryCount, isSellAssetUtxo, isSellAssetSolana } =
    context

  const explorerUrl = useMemo(() => {
    if (!txHash) return undefined
    if (isSellAssetUtxo) return `https://mempool.space/tx/${txHash}`
    if (isSellAssetSolana) return `https://solscan.io/tx/${txHash}`
    return `${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${txHash}`
  }, [txHash, isSellAssetUtxo, isSellAssetSolana, sellAsset.explorerTxLink])

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
          <div className='ssw-step-title'>Confirming Transaction</div>
          <div className='ssw-step-subtitle'>Your swap is being processed…</div>
          {explorerUrl && <ExplorerLink url={explorerUrl} />}
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
          {explorerUrl && <ExplorerLink url={explorerUrl} />}
          <div className='ssw-step-actions'>
            <button
              className='ssw-action-btn'
              onClick={() => send({ type: 'RESET' })}
              type='button'
            >
              New Swap
            </button>
          </div>
        </>
      )}

      {isError && (
        <>
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
              <path d='M15 9l-6 6M9 9l6 6' />
            </svg>
          </div>
          <div className='ssw-step-title'>Transaction Failed</div>
          <div className='ssw-step-subtitle'>{truncatedError ?? 'Something went wrong'}</div>
          <div className='ssw-step-actions'>
            {retryCount < 3 && (
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
              Start Over
            </button>
          </div>
        </>
      )}
    </div>
  )
}
