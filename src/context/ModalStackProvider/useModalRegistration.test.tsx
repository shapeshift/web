import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseModalRegistrationProps } from './useModalRegistration'
import { useModalRegistration } from './useModalRegistration'

import { TestProviders } from '@/test/TestProviders'

const mockRegisterModal = vi.fn()
const mockUnregisterModal = vi.fn()
const mockGetIsHighestModal = vi.fn()
const mockGetZIndex = vi.fn()

vi.mock('./ModalStackProvider', async () => {
  const actual = await vi.importActual('./ModalStackProvider')

  return {
    ...actual,
    useModalStack: () => ({
      registerModal: mockRegisterModal,
      unregisterModal: mockUnregisterModal,
      getIsHighestModal: mockGetIsHighestModal,
      getZIndex: mockGetZIndex,
    }),
  }
})

const setup = (initialProps: UseModalRegistrationProps) => {
  const wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  )
  return renderHook(props => useModalRegistration(props), {
    wrapper,
    initialProps,
  })
}

describe('useModalRegistration', () => {
  beforeEach(() => {
    mockGetZIndex.mockReturnValue(1)
    mockGetIsHighestModal.mockReturnValue(true)
    mockRegisterModal.mockReturnValue(1)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers modal when isOpen is true', () => {
    setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(mockRegisterModal).toHaveBeenCalled()
  })

  it('does not register modal when isOpen is false', () => {
    setup({
      isOpen: false,
      onClose: vi.fn(),
    })

    expect(mockRegisterModal).not.toHaveBeenCalled()
  })

  it('unregisters modal when isOpen changes from true to false', () => {
    const onClose = vi.fn()
    const { rerender } = setup({
      isOpen: true,
      onClose,
    })

    expect(mockRegisterModal).toHaveBeenCalled()

    // Clear the mock to track new calls
    mockUnregisterModal.mockClear()

    rerender({
      isOpen: false,
      onClose,
    })

    // unregisterModal should be called when isOpen changes to false
    expect(mockUnregisterModal).toHaveBeenCalled()
  })

  it('unregisters modal on unmount', () => {
    const { unmount } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    unmount()

    expect(mockUnregisterModal).toHaveBeenCalled()
  })

  it('returns correct zIndex', () => {
    mockGetZIndex.mockReturnValue(3)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.zIndex).toBe(3)
  })

  it('returns correct isHighestModal value', () => {
    mockGetIsHighestModal.mockReturnValue(false)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.isHighestModal).toBe(false)
  })

  it('returns modalContentProps with correct zIndex and pointerEvents when highest modal', () => {
    mockGetZIndex.mockReturnValue(2)
    mockGetIsHighestModal.mockReturnValue(true)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.modalContentProps).toEqual({
      containerProps: {
        sx: {
          zIndex: 'calc(var(--chakra-zIndices-modal) + 2)',
          pointerEvents: 'auto',
        },
      },
    })
  })

  it('returns modalContentProps with pointerEvents none when not highest modal', () => {
    mockGetZIndex.mockReturnValue(1)
    mockGetIsHighestModal.mockReturnValue(false)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.modalContentProps).toEqual({
      containerProps: {
        sx: {
          zIndex: 'calc(var(--chakra-zIndices-modal) + 1)',
          pointerEvents: 'none',
        },
      },
    })
  })

  it('returns overlayProps with correct zIndex and pointerEvents when highest modal', () => {
    mockGetZIndex.mockReturnValue(2)
    mockGetIsHighestModal.mockReturnValue(true)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.overlayProps).toEqual({
      sx: {
        zIndex: 'calc(var(--chakra-zIndices-overlay) + 2)',
        pointerEvents: 'auto',
      },
    })
  })

  it('returns overlayProps with pointerEvents none when not highest modal', () => {
    mockGetZIndex.mockReturnValue(1)
    mockGetIsHighestModal.mockReturnValue(false)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.overlayProps).toEqual({
      sx: {
        zIndex: 'calc(var(--chakra-zIndices-overlay) + 1)',
        pointerEvents: 'none',
      },
    })
  })

  it('returns undefined for modalContentProps when zIndex is 0', () => {
    mockGetZIndex.mockReturnValue(0)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.modalContentProps).toBeUndefined()
  })

  it('returns undefined for overlayProps when zIndex is 0', () => {
    mockGetZIndex.mockReturnValue(0)

    const { result } = setup({
      isOpen: true,
      onClose: vi.fn(),
    })

    expect(result.current.overlayProps).toBeUndefined()
  })

  it('returns modalProps with correct values when highest modal', () => {
    mockGetIsHighestModal.mockReturnValue(true)
    const onClose = vi.fn()

    const { result } = setup({
      isOpen: true,
      onClose,
    })

    expect(result.current.modalProps).toEqual({
      trapFocus: true,
      blockScrollOnMount: true,
      closeOnEsc: true,
      closeOnOverlayClick: true,
      isOpen: true,
      onClose,
    })
  })

  it('returns modalProps with disabled interactions when not highest modal', () => {
    mockGetIsHighestModal.mockReturnValue(false)
    const onClose = vi.fn()

    const { result } = setup({
      isOpen: true,
      onClose,
    })

    expect(result.current.modalProps).toEqual({
      trapFocus: false,
      blockScrollOnMount: false,
      closeOnEsc: false,
      closeOnOverlayClick: false,
      isOpen: true,
      onClose,
    })
  })

  it('updates modalProps when isOpen changes', () => {
    const onClose = vi.fn()
    const { result, rerender } = setup({
      isOpen: true,
      onClose,
    })

    expect(result.current.modalProps.isOpen).toBe(true)

    rerender({
      isOpen: false,
      onClose,
    })

    expect(result.current.modalProps.isOpen).toBe(false)
  })
})
