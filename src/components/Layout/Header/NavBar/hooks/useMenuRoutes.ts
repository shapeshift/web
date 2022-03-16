import { useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/MenuRoutes/WalletConnectedMenuRoutes'

export const useMenuRoutes = () => {
  const history = useHistory()
  const handleBackClick = useCallback(() => history.goBack(), [history])
  const handleKeepKeyClick = useCallback(
    () => history.push(WalletConnectedRoutes.KeepKey),
    [history]
  )
  const handleChangePinClick = useCallback(
    () => history.push(WalletConnectedRoutes.KeepKeyPin),
    [history]
  )

  return { handleKeepKeyClick, handleBackClick, handleChangePinClick }
}
