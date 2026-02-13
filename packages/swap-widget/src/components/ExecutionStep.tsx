import { useMemo } from 'react'

import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type ExecutionStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
}

export const ExecutionStep = ({ context, send: _send }: ExecutionStepProps) => {
  const { sellAsset, txHash, isSellAssetUtxo, isSellAssetSolana } = context

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

  return (
    <div className='ssw-tx-status ssw-tx-status-pending'>
      <div className='ssw-tx-status-icon'>
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
      </div>
      <div className='ssw-tx-status-content'>
        <span className='ssw-tx-status-message'>Waiting for wallet confirmation...</span>
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
      </div>
    </div>
  )
}
