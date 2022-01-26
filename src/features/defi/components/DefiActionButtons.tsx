import { Button, ButtonGroup } from '@chakra-ui/react'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useTranslate } from 'react-polyglot'
import { useMatch, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

export const DefiActionButtons = () => {
  const translate = useTranslate()
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  // const { location, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  // const match = matchPath<DefiParams>(location.pathname, {
  //   path: '/defi/:earnType/:provider/:action',
  //   exact: true
  // })

  const handleClick = (action: DefiAction) => {
    if (params) {
      const { earnType, provider } = params
      navigate(`/defi/${earnType}/${provider}/${action}`)
    }
  }

  let activeDeposit = params?.action === DefiAction.Deposit
  let activeWithdraw = params?.action === DefiAction.Withdraw
  return (
    <ButtonGroup variant='ghost' colorScheme='blue' px={6} pt={6}>
      <Button
        isActive={activeDeposit}
        onClick={() => handleClick(DefiAction.Deposit)}
      >
        {translate('common.deposit')}
      </Button>
      <Button
        isActive={activeWithdraw}
        onClick={() => handleClick(DefiAction.Withdraw)}
      >
        {translate('common.withdraw')}
      </Button>
    </ButtonGroup>
  )
}
