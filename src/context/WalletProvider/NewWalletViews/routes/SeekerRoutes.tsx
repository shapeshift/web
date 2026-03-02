import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { SeekerConnect } from '../../Seeker/components/Connect'
import { SeekerFailure } from '../../Seeker/components/Failure'

export const SeekerRoutes = () => {
  const seekerConnectElement = useMemo(() => <SeekerConnect />, [])
  const seekerFailureElement = useMemo(() => <SeekerFailure />, [])

  return (
    <Routes>
      <Route path='/seeker/connect' element={seekerConnectElement} />
      <Route path='/seeker/failure' element={seekerFailureElement} />
    </Routes>
  )
}
