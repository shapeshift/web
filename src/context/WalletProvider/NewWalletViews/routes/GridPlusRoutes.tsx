import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { GridPlusConnect } from '../../GridPlus/components/Connect'
import { GridPlusPair } from '../../GridPlus/components/GridPlusPair'
import { GridPlusSetup } from '../../GridPlus/components/GridPlusSetup'

export const GridPlusRoutes = () => {
  const gridPlusConnectElement = useMemo(() => <GridPlusConnect />, [])
  const gridPlusPairElement = useMemo(() => <GridPlusPair />, [])
  const gridPlusSetupElement = useMemo(() => <GridPlusSetup />, [])

  return (
    <Routes>
      <Route path='/gridplus/connect' element={gridPlusConnectElement} />
      <Route path='/gridplus/pair' element={gridPlusPairElement} />
      <Route path='/gridplus/setup' element={gridPlusSetupElement} />
    </Routes>
  )
}
