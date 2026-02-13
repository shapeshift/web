import { useMemo } from 'react'

import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type StatusStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  isPolling: boolean
  isComplete: boolean
  isError: boolean
}

export const StatusStep = ({ context, send, isPolling, isComplete, isError }: StatusStepProps) => {
  const { sellAsset, txHash, error, retryCount, isSellAssetUtxo, isSellAssetSolana } = context

  const explorerUrl = useMemo(() => {
    if (!txHash) return undefined
    if (isSellAssetUtxo) {
      return `https://mempool.space/tx/${txHash}`
    }
    if (isSellAssetSolana) {
      return `https://solscan.io/tx/${txHash}`
    }
    return `${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${txHash}`
  }, [txHash, isSellAssetUtxo, isSellAssetSolana, sellAsset.explorerTxLink])

  const statusClass = useMemo(() => {
    if (isPolling) return 'ssw-tx-status-pending'
    if (isComplete) return 'ssw-tx-status-success'
    if (isError) return 'ssw-tx-status-error'
    return 'ssw-tx-status-pending'
  }, [isPolling, isComplete, isError])

  return (
    <div className={`ssw-tx-status ${statusClass}`}>
      <div className='ssw-tx-status-icon'>
        {isPolling && (
          <svg
            className='ssw-spinner'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='12' cy='12' r='10' opacity='0.25' />
            <path d='M12 2a10 10 0 0 1 10 10' />
          </svg>
        )}
        {isComplete && (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M20 6L9 17l-5-5' />
          </svg>
        )}
        {isError && (
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <circle cx='12' cy='12' r='10' />
            <path d='M15 9l-6 6M9 9l6 6' />
          </svg>
        )}
      </div>
      <div className='ssw-tx-status-content'>
        {isPolling && (
          <>
            <span className='ssw-tx-status-message'>Confirming transaction...</span>
            {txHash && explorerUrl && (
              <a
                href={explorerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='ssw-tx-status-link'
              >
                View transaction
              </a>
            )}
          </>
        )}
        {isComplete && (
          <>
            <span className='ssw-tx-status-message'>Transaction confirmed!</span>
            {txHash && explorerUrl && (
              <a
                href={explorerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='ssw-tx-status-link'
              >
                View transaction
              </a>
            )}
          </>
        )}
        {isError && (
          <span className='ssw-tx-status-message'>{error ?? 'Transaction failed'}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {isComplete && (
          <button
            className='ssw-action-btn'
            onClick={() => send({ type: 'RESET' })}
            type='button'
          >
            New Swap
          </button>
        )}
        {isError && retryCount < 3 && (
          <button
            className='ssw-action-btn'
            onClick={() => send({ type: 'RETRY' })}
            type='button'
          >
            Retry
          </button>
        )}
        {isError && (
          <button
            className='ssw-action-btn ssw-secondary'
            onClick={() => send({ type: 'RESET' })}
            type='button'
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  )
}
