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
    // On ramp page, just navigate - the URL change will update everything
    if (isRampPage) {
      navigate('/ramp/buy')
      return
    }
    setAction(FiatRampAction.Buy)
  }, [isRampPage, navigate, setAction])

  const handleSellClick = useCallback(() => {
    // On ramp page, just navigate - the URL change will update everything
    if (isRampPage) {
      navigate('/ramp/sell')
      return
    }
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
