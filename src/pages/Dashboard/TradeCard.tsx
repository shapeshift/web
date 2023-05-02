import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Bridge } from 'components/Bridge/Bridge'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { Text } from 'components/Text/Text'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { Trade } from 'components/Trade/Trade'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { useSwapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export type TradeCardProps = {
  defaultBuyAssetId?: AssetId
} & CardProps

export const TradeCard = ({ defaultBuyAssetId, ...cardProps }: TradeCardProps) => {
  const { Axelar } = useSelector(selectFeatureFlags)
  const {
    state: { wallet },
  } = useWallet()
  const isKeplr = useMemo(() => wallet instanceof KeplrHDWallet, [wallet])

  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  const clearAmounts = useSwapperStore(state => state.clearAmounts)
  const handleAssetSelection = useSwapperStore(state => state.handleAssetSelection)
  const defaultBuyAsset = useAppSelector(state =>
    defaultBuyAssetId ? selectAssetById(state, defaultBuyAssetId) : undefined,
  )

  useEffect(() => {
    if (!defaultBuyAsset) return

    handleAssetSelection({ asset: defaultBuyAsset, action: AssetClickAction.Buy })
    clearAmounts()
  }, [defaultBuyAsset, clearAmounts, handleAssetSelection])

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <Card flex={1} {...cardProps}>
        <Tabs isFitted variant='enclosed'>
          {Axelar && (
            <TabList>
              <Tab>
                <Text translation='dashboard.tradeCard.trade' />
              </Tab>
              <Tab>
                <Text translation='dashboard.tradeCard.bridge' />
              </Tab>
            </TabList>
          )}

          <TabPanels>
            <TabPanel py={4} px={6}>
              <Trade />
            </TabPanel>
            {Axelar && (
              <TabPanel py={4} px={6}>
                <Bridge />
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Card>
    </MessageOverlay>
  )
}
