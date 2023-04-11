import { act, renderHook } from '@testing-library/react'
import {
  createInitialState,
  createModalProvider,
  modalReducer as instanceReducer,
} from 'context/ModalProvider/ModalProvider'
import { makeUseModal } from 'hooks/useModal/useModal'

import { createModalContext } from './ModalContext'

function setup<M extends {}>(modals: M) {
  const instanceInitialState = createInitialState(modals)
  const InstanceModalContext = createModalContext(instanceInitialState)
  const ModalProvider = createModalProvider({
    instanceInitialState,
    instanceReducer,
    InstanceModalContext,
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>{children}</ModalProvider>
  )

  return renderHook(() => makeUseModal(InstanceModalContext)(), { wrapper })
}

describe('useModal', () => {
  const AwwYeah = (name: string) => `awwww yeah ${name}`
  const Add42 = (num: number) => `${num} plus 42 is ${num + 42}`
  const modalSetup = { awwYeah: AwwYeah, add42: Add42 }

  it('generates correct modal names', () => {
    const { result } = setup(modalSetup)
    const { current: modals } = result
    const modalNamesFromSetup = Object.keys(modalSetup)
    const modalNamesFromHook = Object.keys(modals)
    expect(modalNamesFromHook.length).toEqual(modalNamesFromSetup.length)
    modalNamesFromHook.forEach(modalName => expect(modalNamesFromSetup.includes(modalName)))
  })

  it('can open and close', () => {
    const { result } = setup(modalSetup)
    expect(result.current.awwYeah.isOpen).toBeFalsy()
    act(() => result.current.awwYeah.open('baby'))
    expect(result.current.awwYeah.isOpen).toBeTruthy()
    act(() => result.current.awwYeah.close())
    expect(result.current.awwYeah.isOpen).toBeFalsy()
  })
})
