import { ethAssetId } from '@shapeshiftoss/caip'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SendInput } from './Form'
import { Form } from './Form'
import { SendFormFields, SendRoutes } from './SendCommon'

const usdcAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const mocks = vi.hoisted(() => ({
  parsedAssetId: 'eip155:1/slip44:60',
  direct: false,
}))

vi.mock('./hooks/useCompleteSendFlow', () => ({ useCompleteSendFlow: () => vi.fn() }))
vi.mock('./hooks/useFormSend/useFormSend', () => ({
  useFormSend: () => ({ handleFormSend: vi.fn() }),
}))
vi.mock('./utils', () => ({ maybeFetchChangeAddress: vi.fn() }))
vi.mock('./views/Confirm', () => ({ Confirm: (): null => null }))
vi.mock('./views/SendAmountDetails', () => ({ SendAmountDetails: (): null => null }))
vi.mock('./views/Address', async (): Promise<{ Address: () => ReactElement }> => {
  const { useFormContext, useWatch } = await import('react-hook-form')
  const { useNavigate } = await import('react-router-dom')
  return {
    Address: (): ReactElement => {
      const { control } = useFormContext<SendInput>()
      const assetId = useWatch({ name: SendFormFields.AssetId, control })
      const navigate = useNavigate()
      return (
        <>
          <output>{assetId}</output>
          <button type='button' onClick={() => navigate(SendRoutes.Scan)}>
            Scan
          </button>
        </>
      )
    },
  }
})
vi.mock('@/components/QrCodeScanner/QrCodeScanner', () => ({
  QrCodeScanner: ({ onSuccess }: { onSuccess: (value: string) => Promise<void> }): ReactElement => (
    <button type='button' onClick={() => onSuccess('test recipient')}>
      Read QR
    </button>
  ),
}))
vi.mock('@/components/SelectAssets/SelectAssetRouter', () => ({
  SelectAssetRouter: ({ onClick }: { onClick: (value: string) => void }): ReactElement => (
    <button
      type='button'
      onClick={() => onClick('eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')}
    >
      Select USDC
    </button>
  ),
}))
vi.mock('@/components/SlideTransition', () => ({
  SlideTransition: ({ children }: { children: ReactNode }): ReactNode => children,
}))
vi.mock('@/hooks/useModal/useModal', () => ({ useModal: () => ({ close: vi.fn() }) }))
vi.mock('@/hooks/useWallet/useWallet', () => ({ useWallet: () => ({ state: {} }) }))
vi.mock('@/lib/mixpanel/mixPanelSingleton', () => ({ getMixPanel: () => undefined }))
vi.mock('@/state/store', () => ({ store: { getState: () => ({}) }, useAppSelector: () => [] }))
vi.mock('@/state/slices/selectors', () => ({
  selectFirstAccountIdByChainId: () => undefined,
  selectPortfolioAccountIdsByAssetIdFilter: () => [],
  selectMarketDataByAssetIdUserCurrency: () => ({ price: '1' }),
}))
vi.mock('@/lib/address/address', () => ({
  parseAddress: () => Promise.resolve({ assetId: mocks.parsedAssetId, chainId: 'eip155:1' }),
  parseAddressInputWithChainId: () =>
    Promise.resolve({
      address: '0x1111111111111111111111111111111111111111',
    }),
}))
vi.mock('@/lib/address/bip21', () => ({
  parseUrlDirect: () =>
    mocks.direct
      ? {
          assetId: mocks.parsedAssetId,
          chainId: mocks.parsedAssetId.split('/')[0],
          maybeAddress: '0x1111111111111111111111111111111111111111',
        }
      : null,
}))

afterEach(cleanup)

describe('send QR asset selection', () => {
  it.each([undefined, ethAssetId])(
    'preserves the selected token after scanning a plain address (initial asset: %s)',
    async initialAssetId => {
      mocks.direct = false
      mocks.parsedAssetId = ethAssetId
      render(
        <MemoryRouter initialEntries={['/send/select']}>
          <Form initialAssetId={initialAssetId} />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Select USDC' }))
      await screen.findByRole('button', { name: 'Scan' })
      fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Read QR' }))
      await waitFor(() => expect(screen.getByRole('status').textContent).toBe(usdcAssetId))
    },
  )
  it.each([
    ['explicit token', 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f'],
    ['different chain', 'eip155:8453/slip44:60'],
  ])('honours a QR code specifying a %s', async (_label, expectedAssetId) => {
    mocks.direct = true
    mocks.parsedAssetId = expectedAssetId
    render(
      <MemoryRouter initialEntries={['/send/select']}>
        <Form />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Select USDC' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Scan' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Read QR' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(expectedAssetId))
  })
})
