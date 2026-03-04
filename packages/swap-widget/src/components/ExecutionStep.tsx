import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'

type ExecutionStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
}

export const ExecutionStep = ({ context: _context, send: _send }: ExecutionStepProps) => (
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
    <div className='ssw-step-title'>Confirm in Wallet</div>
    <div className='ssw-step-subtitle'>Please sign the transaction in your wallet</div>
  </div>
)
