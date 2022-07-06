import { Button, ButtonGroup } from '@chakra-ui/react'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { matchPath } from 'react-router-dom'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

type DefiActionButtonProps = {
  vaultExpired?: boolean
  showOverview?: boolean
}

export const DefiActionButtons = ({ vaultExpired, showOverview }: DefiActionButtonProps) => {
  const translate = useTranslate()
  const { location, history, query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(location.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true,
  })

  const handleClick = (action: DefiAction) => {
    history.push({
      pathname: `/defi/earn`,
      search: qs.stringify({
        ...query,
        modal: action,
      }),
    })
  }

  return (
    <ButtonGroup variant='ghost' colorScheme='blue'>
      {showOverview && (
        <Button
          isActive={match?.params?.action === DefiAction.Overview}
          onClick={() => handleClick(DefiAction.Overview)}
        >
          {translate('common.overview')}
        </Button>
      )}
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
