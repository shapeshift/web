import qs from 'qs'
import { useLocation } from 'react-router-dom'

export function useQuery<T>(): T {
  const location = useLocation()
  const query = qs.parse(location.search, { ignoreQueryPrefix: true })
  return query as unknown as T
}
