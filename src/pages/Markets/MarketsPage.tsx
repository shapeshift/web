import { Navigate, Route, Routes } from 'react-router-dom'

import { Category } from './Category'
import { Recommended } from './Recommended'
import { WatchList } from './Watchlist'

const recommended = <Recommended />
const watchList = <WatchList />
const category = <Category />
const redirect = <Navigate to='recommended' replace />

export const MarketsPage = () => {
  'use no memo'
  return (
    <Routes>
      <Route path='' element={redirect} />
      <Route path='recommended' element={recommended} />
      <Route path='watchlist' element={watchList} />
      <Route path='category/:category' element={category} />
    </Routes>
  )
}
