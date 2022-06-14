import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Stack } from '@chakra-ui/layout'
import {
  Button,
  Link,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text as CText,
} from '@chakra-ui/react'
import { generateOnRampURL } from '@coinbase/cbpay-js'
import { adapters, AssetId, fromAccountId } from '@shapeshiftoss/caip'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { getConfig } from 'config'
import { FoxyPath } from 'features/defi/providers/foxy/components/FoxyManager/FoxyCommon'
import qs from 'qs'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import coinbaseLogo from 'assets/coinbase-pay/cb-pay-icon.png'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FOX_ASSET_ID, TrimmedDescriptionLength } from '../FoxCommon'

type FoxTabProps = {
  assetId: AssetId
}

const TradeFoxyElasticSwapUrl = `https://elasticswap.org/#/swap`

export const AssetActions: React.FC<FoxTabProps> = ({ assetId }) => {
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const [coinbasePayLink, setCoinbasePayLink] = useState<string | null>(null)
  const { description } = asset || {}
  const trimmedDescription = trimWithEndEllipsis(description, TrimmedDescriptionLength)
  const isFoxAsset = assetId === FOX_ASSET_ID
  const coinbasePayFeatureFlag = useFeatureFlag('CoinbasePay')

  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const accountId = accountIds?.[0]

  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const { receive } = useModal()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  const handleReceiveClick = () =>
    isConnected ? receive.open({ asset, accountId }) : handleWalletModalOpen()

  useEffect(() => {
    if (!accountId) return
    const { account: foxUserAddress } = fromAccountId(accountId)
    const ticker = adapters.coinbaseTickerToAssetId(assetId) ?? 'FOX'
    const coinbasePayFoxLink = generateOnRampURL({
      appId: getConfig().REACT_APP_COINBASE_PAY_APP_ID,
      destinationWallets: [{ address: foxUserAddress, assets: [ticker] }],
    })
    setCoinbasePayLink(coinbasePayFoxLink)
  }, [accountId, assetId])

  const onGetAssetClick = () => {
    history.push({
      pathname: FoxyPath.Overview,
      search: qs.stringify({
        chainId: asset.chainId,
        contractAddress: foxyAddresses[0].staking,
        assetReference: foxyAddresses[0].fox,
        rewardId: foxyAddresses[0].foxy,
      }),
      state: { background: location },
    })
  }

  return (
    <Card display='block' borderRadius={8}>
      <Card.Body p={0}>
        <Tabs isFitted>
          <TabList>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.getAsset', {
                assetSymbol: asset.symbol,
              })}
            </Tab>
            <Tab py={4} color='gray.500' fontWeight='semibold'>
              {translate('plugins.foxPage.trade')}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel textAlign='center' p={6}>
              <Box mb={6}>
                <AssetIcon
                  src={coinbasePayFeatureFlag && isFoxAsset ? coinbaseLogo : asset.icon}
                  boxSize='16'
                />
              </Box>
              <SkeletonText isLoaded={Boolean(description?.length)} noOfLines={3}>
                <CText color='gray.500' mb={6}>
                  {coinbasePayFeatureFlag && isFoxAsset
                    ? translate('plugins.foxPage.purchaseFox')
                    : trimmedDescription}
                </CText>
              </SkeletonText>

              <Stack width='full'>
                {!isFoxAsset && (
                  <Button onClick={onGetAssetClick} colorScheme={'blue'} mb={2} size='lg'>
                    <CText>
                      {translate('plugins.foxPage.getAsset', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </Button>
                )}
                {isFoxAsset && coinbasePayFeatureFlag && (
                  <Button
                    isDisabled={!coinbasePayLink}
                    colorScheme={'blue'}
                    mb={2}
                    size='lg'
                    as={Link}
                    leftIcon={<ExternalLinkIcon />}
                    href={coinbasePayLink}
                    isExternal
                  >
                    <CText>
                      {translate('plugins.foxPage.buyAssetOnCoinbase', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </Button>
                )}
                <Button onClick={handleReceiveClick} size='lg' colorScheme='gray'>
                  <Text translation={'plugins.foxPage.receive'} />
                </Button>
              </Stack>
            </TabPanel>
            <TabPanel textAlign='center' p={0}>
              {isFoxAsset && <TradeCard defaultBuyAssetId={assetId} />}
              {!isFoxAsset && (
                <Stack width='full' p={6}>
                  <SkeletonText isLoaded={Boolean(description?.length)} noOfLines={3}>
                    <CText color='gray.500' mt={6} mb={6}>
                      {translate('plugins.foxPage.tradingUnavailable', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </SkeletonText>
                  <Button
                    colorScheme={'blue'}
                    mb={6}
                    size='lg'
                    as={Link}
                    leftIcon={<ExternalLinkIcon />}
                    href={TradeFoxyElasticSwapUrl}
                    isExternal
                  >
                    <CText>
                      {translate('plugins.foxPage.tradeOnElasticSwap', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </Button>
                </Stack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card.Body>
    </Card>
  )
}
