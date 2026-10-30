import { ChakraProvider, Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { oathWalletLink, OathWalletOption } from './OathWalletOption'

import { ModalStackProvider, useModalRegistration } from '@/context/ModalStackProvider'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getAdapter: vi.fn(),
  pairDevice: vi.fn(),
  setLocalWallet: vi.fn(),
}))
vi.mock('@/hooks/useWallet/useWallet', () => ({
  useWallet: () => ({ dispatch: mocks.dispatch, getAdapter: mocks.getAdapter }),
}))
vi.mock('@/context/WalletProvider/local-wallet', () => ({
  useLocalWallet: () => ({ setLocalWallet: mocks.setLocalWallet }),
}))
vi.mock('@/context/WalletProvider/WalletConnectV2/config', () => ({
  WalletConnectV2Config: { name: 'WalletConnect', icon: () => null },
}))
vi.mock('react-polyglot', () => ({ useTranslate: () => (key: string) => key }))
vi.mock('@/components/Text', () => ({
  Text: ({ translation }: { translation: string }) => <span>{translation}</span>,
  RawText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('react-qrcode-logo', () => ({
  QRCode: ({ value }: { value: string }) => <output data-testid='qr-value'>{value}</output>,
}))

const uri = 'wc:test-pairing@2?relay-protocol=irn&symKey=synthetic-test-key'
const ParentWalletModal = () => {
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen: true,
    onClose: vi.fn(),
  })
  return (
    <Modal {...modalProps}>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps}>
        <OathWalletOption />
      </ModalContent>
    </Modal>
  )
}
const renderOption = () =>
  render(
    <ChakraProvider>
      <ModalStackProvider>
        <ParentWalletModal />
      </ModalStackProvider>
    </ChakraProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAdapter.mockResolvedValue({ pairDevice: mocks.pairDevice })
})
afterEach(cleanup)

describe('Oath direct selector', () => {
  it('opens the QR and exact iOS handoff directly from the Oath button', async () => {
    mocks.pairDevice.mockImplementation(({ onDisplayUri }) => {
      onDisplayUri(uri)
      return new Promise(() => {})
    })
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    expect((await screen.findByTestId('qr-value')).textContent).toBe(uri)
    expect(screen.getByText('walletProvider.oath.connectInstructions')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'walletProvider.oath.openApp' }).getAttribute('href'),
    ).toBe(oathWalletLink(uri))
    expect(
      screen.getByRole('link', { name: 'walletProvider.oath.download' }).getAttribute('href'),
    ).toBe('https://apps.apple.com/app/id6780187283')
    expect(mocks.pairDevice).toHaveBeenCalledOnce()
    expect(mocks.setLocalWallet).not.toHaveBeenCalled()
  })

  it('clears the displayed QR and aborts when closed, then allows a fresh attempt', async () => {
    mocks.pairDevice.mockImplementation(({ onDisplayUri }) => {
      onDisplayUri(uri)
      return new Promise(() => {})
    })
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    await screen.findByTestId('qr-value')
    const first = mocks.pairDevice.mock.calls[0][0]
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    expect(first.signal.aborted).toBe(true)
    await waitFor(() => expect(screen.queryByTestId('qr-value')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    await waitFor(() => expect(mocks.pairDevice).toHaveBeenCalledTimes(2))
    expect(mocks.pairDevice.mock.calls[1][0].signal.aborted).toBe(false)
  })

  it('does not start pairing if dismissed while the adapter is loading', async () => {
    const resolveAdapter = { current: (_adapter: unknown) => {} }
    mocks.getAdapter.mockReturnValue(
      new Promise(resolve => {
        resolveAdapter.current = resolve
      }),
    )
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    expect(screen.queryByText('walletProvider.oath.connectInstructions')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'common.close' }))
    await act(async () => {
      resolveAdapter.current({ pairDevice: mocks.pairDevice })
      await Promise.resolve()
    })
    expect(mocks.pairDevice).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('shows a retry after rejection without saving a wallet', async () => {
    mocks.pairDevice
      .mockRejectedValueOnce(new Error('Rejected'))
      .mockImplementationOnce(({ onDisplayUri }) => {
        onDisplayUri(uri)
        return new Promise(() => {})
      })
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    const retry = await screen.findByRole('button', { name: 'walletProvider.oath.retry' })
    expect(screen.queryByText('walletProvider.oath.connectInstructions')).toBeNull()
    fireEvent.click(retry)
    expect((await screen.findByTestId('qr-value')).textContent).toBe(uri)
    expect(mocks.pairDevice).toHaveBeenCalledTimes(2)
    expect(mocks.setLocalWallet).not.toHaveBeenCalled()
  })

  it('aborts on unmount and ignores subsequent URI events', async () => {
    mocks.pairDevice.mockImplementation(() => new Promise(() => {}))
    const { unmount } = renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    await waitFor(() => expect(mocks.pairDevice).toHaveBeenCalledOnce())
    const attempt = mocks.pairDevice.mock.calls[0][0]
    unmount()
    expect(attempt.signal.aborted).toBe(true)
    act(() => attempt.onDisplayUri(uri))
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('saves an approved connection using the existing WalletConnect reload path', async () => {
    const wallet = { provider: {}, getDeviceID: vi.fn().mockResolvedValue('test-device') }
    mocks.pairDevice.mockResolvedValue(wallet)
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    await waitFor(() => expect(mocks.setLocalWallet).toHaveBeenCalledOnce())
    expect(mocks.setLocalWallet).toHaveBeenCalledWith({
      type: 'walletconnectv2',
      deviceId: 'test-device',
    })
    expect(mocks.dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      'SET_WCV2_PROVIDER',
      'SET_WALLET',
      'SET_IS_CONNECTED',
      'SET_WALLET_MODAL',
    ])
  })

  it('removes a completed wallet if closed before its device ID is available', async () => {
    const resolveId = { current: (_id: string) => {} }
    const wallet = {
      provider: {},
      getDeviceID: vi.fn(
        () =>
          new Promise<string>(resolve => {
            resolveId.current = resolve
          }),
      ),
      disconnect: vi.fn(),
    }
    const keyring = {
      wallets: { 'test-device': wallet },
      remove: vi.fn().mockResolvedValue(undefined),
    }
    mocks.getAdapter.mockResolvedValue({ pairDevice: mocks.pairDevice, keyring })
    mocks.pairDevice.mockResolvedValue(wallet)
    renderOption()
    fireEvent.click(screen.getByRole('button', { name: 'Oath Wallet' }))
    await waitFor(() => expect(wallet.getDeviceID).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }))
    await act(async () => {
      resolveId.current('test-device')
      await Promise.resolve()
    })
    expect(keyring.remove).toHaveBeenCalledWith('test-device')
    expect(mocks.setLocalWallet).not.toHaveBeenCalled()
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('encodes the complete WalletConnect URI without changing its payload', () => {
    const link = new URL(oathWalletLink(uri))
    expect(link.protocol).toBe('oathwallet:')
    expect(link.hostname).toBe('wc')
    expect(link.searchParams.get('uri')).toBe(uri)
  })
})
