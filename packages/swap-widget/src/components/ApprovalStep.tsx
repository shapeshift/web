import { SwapMachineCtx } from '../machines/SwapMachineContext'

export const ApprovalStep = () => {
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isApproving = SwapMachineCtx.useSelector(s => s.matches('approving'))
  const { send } = SwapMachineCtx.useActorRef()
  const { sellAsset, quote } = context

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
        <div className='ssw-step-subtitle'>Waiting for the approval to confirm</div>
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
        Allow {quote?.swapperName ?? 'the swapper'} to use your {sellAsset.symbol}
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
