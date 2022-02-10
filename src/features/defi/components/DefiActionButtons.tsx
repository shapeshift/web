import { Button, ButtonGroup } from '@chakra-ui/react'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useTranslate } from 'react-polyglot'
import { matchPath } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

export const DefiActionButtons = ({ vaultExpired }: { vaultExpired: boolean }) => {
  const translate = useTranslate()
  const { location, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(location.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true
  })

  const handleClick = (action: DefiAction) => {
    if (match?.params) {
      const { earnType, provider } = match.params
      history.replace({
        ...location,
        pathname: `/defi/${earnType}/${provider}/${action}`
      })
    }
  }

  return (
    <ButtonGroup variant='ghost' colorScheme='blue' px={6} pt={6}>
      <Button
        isActive={match?.params?.action === DefiAction.Deposit}
        onClick={() => handleClick(DefiAction.Deposit)}
        isDisabled={vaultExpired}
      >
        {translate('common.deposit')}
      </Button>
      <Button
        isActive={match?.params?.action === DefiAction.Withdraw}
        onClick={() => handleClick(DefiAction.Withdraw)}
      >
        {translate('common.withdraw')}
      </Button>
    </ButtonGroup>
  )
}
