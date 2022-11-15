import { Text } from '@chakra-ui/react'
import { render, renderHook } from '@testing-library/react'

import { useRefCallback } from './useRefCallback'

function setup<T>() {
  const onInit = jest.fn()
  const onDestroy = jest.fn()

  const { result, rerender } = renderHook(() => useRefCallback<T>({ onInit, onDestroy }))
  return { result, rerender, onInit, onDestroy }
}

describe('useRefCallback', () => {
  it('calls onInit', () => {
    const { result, onInit, onDestroy, rerender } = setup<HTMLParagraphElement>()
    const [tokenListRef, setTokenListRef] = result.current
    expect(tokenListRef).toBe(null)
    render(<Text ref={setTokenListRef} />)
    expect(onInit).toHaveBeenCalled()
    expect(onDestroy).toHaveBeenCalledTimes(0)
    rerender()
    expect(result.current[0]).toBeTruthy()
  })

  it('calls onDestroy and onInit twice', () => {
    const { result, onInit, onDestroy, rerender } = setup<HTMLParagraphElement>()
    const [tokenListRef, setTokenListRef] = result.current
    expect(tokenListRef).toBe(null)
    render(<Text ref={setTokenListRef} />)
    render(<Text ref={setTokenListRef} />)
    expect(onInit).toHaveBeenCalledTimes(2)
    expect(onDestroy).toHaveBeenCalledTimes(1)
    rerender()
    expect(result.current[0]).toBeTruthy()
  })
})
