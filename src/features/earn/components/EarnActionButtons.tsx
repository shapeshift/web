import { Button, ButtonGroup } from '@chakra-ui/react'
import {
  EarnAction,
  EarnParams,
  EarnQueryParams
} from 'features/earn/contexts/EarnManagerProvider/EarnManagerProvider'
import { useTranslate } from 'react-polyglot'
import { useMatch, useParams } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

export const EarnActionButtons = () => {
  const params = useParams()
  const translate = useTranslate()
  const { location, history } = useBrowserRouter<EarnQueryParams, EarnParams>()
  const match = useMatch<EarnParams>(location.pathname, {
    path: '/earn/:earnType/:provider/:action',
    exact: true
  })

  const handleClick = (action: EarnAction) => {
    if (params) {
      const { earnType, provider } = params
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
