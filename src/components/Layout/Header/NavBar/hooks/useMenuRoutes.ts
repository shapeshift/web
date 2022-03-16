import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'

export const useMenuRoutes = () => {
  const history = useHistory()
  const handleKeepKeyClick = useCallback(() => history.push('/keepkey'), [history])
  const handleBackClick = useCallback(() => history.goBack(), [history])
  const handleMenuClose = useCallback(() => history.push('main'), [history])

  return { handleKeepKeyClick, handleBackClick, handleMenuClose }
}
