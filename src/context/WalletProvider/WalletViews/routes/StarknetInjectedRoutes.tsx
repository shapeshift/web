import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { StarknetInjectedConnect } from '../../StarknetInjected/components/Connect'
import type { StarknetInjectedKeyManager } from '../../StarknetInjected/config'
import type { RightPanelContentProps } from '../types'

type StarknetInjectedRoutesProps = Pick<RightPanelContentProps, 'isLoading' | 'setIsLoading'> & {
  keyManager: StarknetInjectedKeyManager
}

export const StarknetInjectedRoutes = ({
  keyManager,
  isLoading,
  setIsLoading,
}: StarknetInjectedRoutesProps) => {
  const connectElement = useMemo(
    () => (
      <StarknetInjectedConnect
        keyManager={keyManager}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    ),
    [keyManager, isLoading, setIsLoading],
  )

  return (
    <Routes>
      <Route path={`/${keyManager}/connect`} element={connectElement} />
    </Routes>
  )
}
