import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'

export const useMenuRoutes = () => {
  const history = useHistory()
  const handleKeepKeyClick = useCallback(() => history.push('/keepkey'), [history])
  const handleBackClick = useCallback(() => history.goBack(), [history])

  return { handleKeepKeyClick, handleBackClick }
}
