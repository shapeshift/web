import { Text } from '@chakra-ui/react'
import { render } from '@testing-library/react'
import { renderHook, RenderResult } from '@testing-library/react-hooks'

import { useRefCallback } from './useRefCallback'

function setup<T>(): {
  result: RenderResult<((node: T) => void)[]>
  onInit: () => void
  onDestroy: () => void
} {
  const onInit = jest.fn()
  const onDestroy = jest.fn()

  const { result } = renderHook(() => useRefCallback<T>({ onInit, onDestroy }))
  return { result, onInit, onDestroy }
}

describe('useRefCallback', () => {
  it('calls onInit', () => {
    const { result, onInit, onDestroy } = setup<HTMLParagraphElement>()
    const [tokenListRef] = result.current
    render(<Text ref={tokenListRef} />)
    expect(onInit).toHaveBeenCalled()
    expect(onDestroy).toHaveBeenCalledTimes(0)
  })
  it('calls onDestroy and onInit twice', () => {
    const { result, onInit, onDestroy } = setup<HTMLParagraphElement>()
    const [tokenListRef] = result.current
    render(<Text ref={tokenListRef} />)
    render(<Text ref={tokenListRef} />)
    expect(onInit).toHaveBeenCalledTimes(2)
    expect(onDestroy).toHaveBeenCalledTimes(1)
  })
})
