import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { matchPath } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import {
  EarnAction,
  EarnParams,
  EarnQueryParams
} from 'context/EarnManagerProvider/EarnManagerProvider'

export const EarnActionButtons = () => {
  const translate = useTranslate()
  const { location, history } = useBrowserRouter<EarnQueryParams, EarnParams>()
  const match = matchPath<EarnParams>(location.pathname, {
    path: '/earn/:earnType/:provider/:action',
    exact: true
  })

  const handleClick = (action: EarnAction) => {
    if (match?.params) {
      const { earnType, provider } = match.params
      history.replace({
        ...location,
        pathname: `/earn/${earnType}/${provider}/${action}`
      })
    }
  }

  return (
    <ButtonGroup variant='ghost' colorScheme='blue' px={6} pt={6}>
      <Button
        isActive={match?.params?.action === EarnAction.Deposit}
        onClick={() => handleClick(EarnAction.Deposit)}
      >
        {translate('common.deposit')}
      </Button>
      <Button
        isActive={match?.params?.action === EarnAction.Withdraw}
        onClick={() => handleClick(EarnAction.Withdraw)}
      >
        {translate('common.withdraw')}
      </Button>
    </ButtonGroup>
  )
}
