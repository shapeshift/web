import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import { Category } from './Category'
import { Recommended } from './Recommended'
import { WatchList } from './Watchlist'

export const MarketsPage = () => {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route path="" element={<Navigate to="recommended" replace />} />
      <Route path="recommended" element={<Recommended />} />
      <Route path="watchlist" element={<WatchList />} />
      <Route path="category/:category" element={<Category />} />
    </Routes>
  )
}
