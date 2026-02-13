import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type QuoteStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
}

export const QuoteStep = ({ context, send: _send }: QuoteStepProps) => {
  const { sellAsset, buyAsset } = context

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
        <span className='ssw-tx-status-message'>
          Fetching quote for {sellAsset.symbol} → {buyAsset.symbol}...
        </span>
      </div>
    </div>
  )
}
