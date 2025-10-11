import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { GridPlusConnect } from '../../GridPlus/components/Connect'

export const GridPlusRoutes = () => {
  const gridPlusConnectElement = useMemo(() => <GridPlusConnect />, [])

  return (
    <Routes>
      <Route path='/gridplus/connect' element={gridPlusConnectElement} />
    </Routes>
  )
}
