import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Bridge } from 'components/Bridge/Bridge'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { Trade } from 'components/Trade/Trade'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

type TradeCardProps = {
  defaultBuyAssetId?: AssetId
} & CardProps

export const TradeCard = ({ defaultBuyAssetId, ...rest }: TradeCardProps) => {
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

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <Card flex={1} variant='outline' {...rest}>
        <Tabs isFitted variant='enclosed'>
          {Axelar && (
            <TabList>
              <Tab>Trade</Tab>
              <Tab>Bridge</Tab>
            </TabList>
          )}

          <TabPanels>
            <TabPanel py={4} px={6}>
              <Trade defaultBuyAssetId={defaultBuyAssetId} />
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
