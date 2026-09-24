import { ethChainId } from '@shapeshiftoss/caip'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContractAddressWarning } from './ContractAddressWarning'

import { useIsSmartContractAddress } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { TestProviders } from '@/test/TestProviders'

vi.mock('@/hooks/useIsSmartContractAddress/useIsSmartContractAddress', () => ({
  useIsSmartContractAddress: vi.fn(),
}))

const CONTRACT_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
const WARNING_COPY =
  'This is a contract address. Double-check that sending here is intentional. Funds sent to the wrong contract can be lost.'

const mockContractCheck = (isContractAddress: boolean | undefined): void => {
  vi.mocked(useIsSmartContractAddress).mockReturnValue({
    data: isContractAddress,
  } as ReturnType<typeof useIsSmartContractAddress>)
}

const renderWarning = (address: string | undefined): void => {
  render(
    <TestProviders>
      <ContractAddressWarning address={address} chainId={ethChainId} />
    </TestProviders>,
  )
}

describe('ContractAddressWarning', () => {
  afterEach(() => {
    cleanup()
  })

  it('warns when the destination is a contract', () => {
    mockContractCheck(true)

    renderWarning(CONTRACT_ADDRESS)

    expect(screen.getByRole('alert').textContent).toContain(WARNING_COPY)
  })

  it('stays hidden for a regular address', () => {
    mockContractCheck(false)

    renderWarning(CONTRACT_ADDRESS)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stays hidden until an address is entered', () => {
    mockContractCheck(true)

    renderWarning('')

    expect(screen.queryByRole('alert')).toBeNull()
    expect(useIsSmartContractAddress).toHaveBeenCalledWith('', ethChainId)
  })
})
