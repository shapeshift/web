import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type ApprovalStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  isApproving: boolean
}

export const ApprovalStep = ({ context, send, isApproving }: ApprovalStepProps) => {
  const { sellAsset, approvalTxHash } = context

  const explorerUrl = approvalTxHash
    ? `${sellAsset.explorerTxLink ?? 'https://etherscan.io/tx/'}${approvalTxHash}`
    : undefined

  if (isApproving) {
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
        <div className='ssw-step-title'>Approving {sellAsset.symbol}…</div>
        <div className='ssw-step-subtitle'>Waiting for wallet confirmation</div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='ssw-step-explorer-link'
          >
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
        )}
      </div>
    )
  }

  return (
    <div className='ssw-step-screen'>
      <div className='ssw-step-icon-circle ssw-ic-accent'>
        <svg
          width='32'
          height='32'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
          <path d='M7 11V7a5 5 0 0 1 10 0v4' />
        </svg>
      </div>
      <div className='ssw-step-title'>Token Approval Required</div>
      <div className='ssw-step-subtitle'>
        Allow the swap contract to use your {sellAsset.symbol}
      </div>
      <div className='ssw-step-actions'>
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
