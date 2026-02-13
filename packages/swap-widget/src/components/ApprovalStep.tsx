import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type ApprovalStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  isApproving: boolean
}

export const ApprovalStep = ({ context, send, isApproving }: ApprovalStepProps) => {
  const { sellAsset, approvalTxHash } = context

  if (isApproving) {
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
          <span className='ssw-tx-status-message'>Approving {sellAsset.symbol}...</span>
          {approvalTxHash && (
            <a
              href={`${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${approvalTxHash}`}
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

  return (
    <div className='ssw-tx-status ssw-tx-status-pending'>
      <div className='ssw-tx-status-content'>
        <span className='ssw-tx-status-message'>
          Token approval required for {sellAsset.symbol}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button className='ssw-action-btn' onClick={() => send({ type: 'APPROVE' })} type='button'>
          Approve {sellAsset.symbol}
        </button>
        <button
          className='ssw-action-btn ssw-secondary'
          onClick={() => send({ type: 'RESET' })}
          type='button'
        >
          Back
        </button>
      </div>
    </div>
  )
}
