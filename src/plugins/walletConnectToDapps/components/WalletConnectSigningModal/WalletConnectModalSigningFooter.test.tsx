import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WalletConnectModalSigningFooter } from './WalletConnectModalSigningFooter'

import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'
import { TestProviders } from '@/test/TestProviders'

const mockSimulation = vi.hoisted(() => ({
  gasEstimateQuery: {} as { isLoading?: boolean; data?: { estimatedGasLimit?: string } },
}))

vi.mock('@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction', () => ({
  useSimulateEvmTransaction: () => ({
    simulationQuery: { isLoading: false },
    gasEstimateQuery: mockSimulation.gasEstimateQuery,
  }),
}))

vi.mock('../WalletConnectFooter', () => ({
  WalletConnectFooter: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('./GasSelectionMenu', () => ({ GasSelectionMenu: () => null }))

const transaction: TransactionParams = {
  from: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  data: '0x',
}

const onConfirm = vi.fn()
const onReject = vi.fn()

const TestFooter = ({
  gasLimit,
  isTransaction = true,
}: {
  gasLimit?: string
  isTransaction?: boolean
}) => {
  const form = useForm<CustomTransactionData>({
    defaultValues: { speed: FeeDataKey.Fast, gasLimit },
  })

  return (
    <TestProviders>
      <FormProvider {...form}>
        <input aria-label='Gas limit' {...form.register('gasLimit')} />
        <WalletConnectModalSigningFooter
          accountId='eip155:1:0x1111111111111111111111111111111111111111'
          transaction={isTransaction ? transaction : undefined}
          formContext={form}
          onConfirm={onConfirm}
          onReject={onReject}
          isSubmitting={false}
        />
      </FormProvider>
    </TestProviders>
  )
}

describe('WalletConnectModalSigningFooter', () => {
  beforeEach(() => {
    mockSimulation.gasEstimateQuery = {}
  })

  afterEach(cleanup)

  it('waits for a gas limit even when simulation has already finished', async () => {
    render(<TestFooter />)
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    expect(confirm).toHaveProperty('disabled', true)
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onReject).toHaveBeenCalledOnce()

    fireEvent.change(screen.getByRole('textbox', { name: 'Gas limit' }), {
      target: { value: '211295' },
    })
    expect(confirm).toHaveProperty('disabled', false)
    fireEvent.click(confirm)
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
    expect(onConfirm.mock.calls[0][0].gasLimit).toBe('211295')
  })

  it('allows a dApp-supplied gas limit without waiting for estimation', () => {
    render(<TestFooter gasLimit='21000' />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false)
  })

  it('enables confirm when our estimate supplies the gas limit', () => {
    mockSimulation.gasEstimateQuery = { data: { estimatedGasLimit: '150000' } }
    render(<TestFooter />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false)
  })

  it('shows confirm as loading while the gas estimate is in flight', () => {
    mockSimulation.gasEstimateQuery = { isLoading: true }
    render(<TestFooter />)
    // Chakra swaps the label for a spinner while loading, so the button can't be found by name
    const confirm = screen
      .getAllByRole('button')
      .find(button => button.hasAttribute('data-loading'))
    expect(confirm).toHaveProperty('disabled', true)
  })

  it('does not require a gas limit for message signing', () => {
    render(<TestFooter isTransaction={false} />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveProperty('disabled', false)
  })
})
