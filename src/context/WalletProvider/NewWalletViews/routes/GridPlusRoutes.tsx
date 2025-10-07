import { Route, Routes } from 'react-router-dom'

import { GridPlusConnect } from '../../GridPlus/components/Connect'

export const GridPlusRoutes = () => {
  return (
    <Routes>
      <Route path='/gridplus/connect' element={<GridPlusConnect />} />
    </Routes>
  )
}