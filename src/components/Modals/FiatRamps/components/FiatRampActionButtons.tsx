import { Tab, TabList, Tabs } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { FiatRampAction } from '../FiatRampsCommon'

export const FiatRampActionButtons = ({
  action,
  setAction,
}: {
  action: FiatRampAction
  setAction: (action: FiatRampAction) => void
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const location = useLocation()
  const isRampPage = location.pathname.includes('/ramp')

  const handleBuyClick = useCallback(() => {
    // i.e not as a modal
    if (isRampPage) navigate('/ramp/buy')
    setAction(FiatRampAction.Buy)
  }, [isRampPage, navigate, setAction])

  const handleSellClick = useCallback(() => {
    // i.e not as a modal
    if (isRampPage) navigate('/ramp/sell')
    setAction(FiatRampAction.Sell)
  }, [isRampPage, navigate, setAction])

  const activeIndex = useMemo(() => Number(action === FiatRampAction.Sell), [action])

  return (
    <Tabs isFitted variant='enclosed' isManual index={activeIndex}>
      <TabList>
        <Tab onClick={handleBuyClick} borderRadius={0}>
          {translate('fiatRamps.buy')}
        </Tab>
        <Tab onClick={handleSellClick} borderRadius={0}>
          {translate('fiatRamps.sell')}
        </Tab>
      </TabList>
    </Tabs>
  )
}
