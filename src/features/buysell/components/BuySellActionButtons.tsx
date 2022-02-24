import { Button, ButtonGroup } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { matchPath } from 'react-router-dom'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'

import {
  BuySellAction,
  BuySellParams,
  BuySellQueryParams
} from '../contexts/BuySellManagerProvider/BuySellManagerProvider'

export const BuySellActionButtons = () => {
  const translate = useTranslate()
  const { location, history } = useBrowserRouter<BuySellQueryParams, BuySellParams>()
  const match = matchPath<BuySellParams>(location.pathname, {
    path: '/buysell/:provider/:action',
    exact: true
  })

  const handleClick = (action: BuySellAction) => {
    if (match?.params) {
      const { provider } = match.params
      history.replace({
        ...location,
        pathname: `/buysell/${provider}/${action}`
      })
    }
  }

  return (
    <ButtonGroup variant='ghost' colorScheme='blue' pt={6}>
      <Button
        isActive={match?.params?.action === BuySellAction.Buy}
        onClick={() => handleClick(BuySellAction.Buy)}
      >
        {translate('common.buy')}
      </Button>
      <Button
        isActive={match?.params?.action === BuySellAction.Sell}
        onClick={() => handleClick(BuySellAction.Sell)}
      >
        {translate('common.sell')}
      </Button>
    </ButtonGroup>
  )
}
