import { Button, ButtonGroup } from '@chakra-ui/react'
import {
  EarnAction,
  EarnParams,
  EarnQueryParams
} from 'features/earn/contexts/EarnManagerProvider/EarnManagerProvider'
import { useTranslate } from 'react-polyglot'
import { useMatch, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

export const EarnActionButtons = () => {
  let location = useLocation()
  let navigate = useNavigate()
  const params = useParams()
  const translate = useTranslate()
  // const match = useMatch<EarnParams>(location.pathname, {
  //   path: '/earn/:earnType/:provider/:action',
  //   expect: true
  // })

  const handleClick = (action: EarnAction) => {
    if (params) {
      const { earnType, provider } = params
      navigate(`/earn/${earnType}/${provider}/${action}`, { replace: true })
    }
  }

  let activeDeposit = params?.action === EarnAction.Deposit
  let activeWithdraw = params?.action === EarnAction.Withdraw
  return (
    <ButtonGroup variant='ghost' colorScheme='blue' px={6} pt={6}>
      <Button
        isActive={activeDeposit}
        onClick={() => handleClick(EarnAction.Deposit)}
      >
        {translate('common.deposit')}
      </Button>
      <Button
        isActive={activeWithdraw}
        onClick={() => handleClick(EarnAction.Withdraw)}
      >
        {translate('common.withdraw')}
      </Button>
    </ButtonGroup>
  )
}
