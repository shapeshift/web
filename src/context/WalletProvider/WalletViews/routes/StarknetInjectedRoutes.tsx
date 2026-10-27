import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { StarknetInjectedConnect } from '../../StarknetInjected/components/Connect'
import { StarknetInjectedFailure } from '../../StarknetInjected/components/Failure'
import type { StarknetInjectedKeyManager } from '../../StarknetInjected/config'

export const StarknetInjectedRoutes = ({
  keyManager,
}: {
  keyManager: StarknetInjectedKeyManager
}) => {
  const connectElement = useMemo(
    () => <StarknetInjectedConnect keyManager={keyManager} />,
    [keyManager],
  )
  const failureElement = useMemo(
    () => <StarknetInjectedFailure keyManager={keyManager} />,
    [keyManager],
  )

  return (
    <Routes>
      <Route path={`/${keyManager}/connect`} element={connectElement} />
      <Route path={`/${keyManager}/failure`} element={failureElement} />
    </Routes>
  )
}
