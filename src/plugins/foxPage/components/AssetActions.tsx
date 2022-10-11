import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Stack } from '@chakra-ui/layout'
import {
  Button,
  Link,
  Skeleton,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text as CText,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core/dist/wallet'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { TradeCard } from 'pages/Dashboard/TradeCard'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'
import { selectAccountIdsByAssetId, selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TrimmedDescriptionLength } from '../FoxCommon'

type FoxTabProps = {
  assetId: AssetId
}

const BuyFoxCoinbaseUrl = 'https://www.coinbase.com/price/fox-token'
const TradeFoxyElasticSwapUrl = `https://elasticswap.org/#/swap`

export const AssetActions: React.FC<FoxTabProps> = ({ assetId }) => {
  const translate = useTranslate()
  const location = useLocation()
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { description } = asset || {}
  const trimmedDescription = trimWithEndEllipsis(description, TrimmedDescriptionLength)
  const isFoxAsset = assetId === foxAssetId

  const accountIds = useAppSelector(state => selectAccountIdsByAssetId(state, { assetId }))
  const accountId = accountIds?.[0]

  const {
    state: { isConnected, isDemoWallet, wallet },
    dispatch,
  } = useWallet()
  const { receive } = useModal()

  const walletSupportsETH = useMemo(() => Boolean(wallet && supportsETH(wallet)), [wallet])

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )
  const handleReceiveClick = useCallback(
    () =>
      isDemoWallet || (isConnected && walletSupportsETH)
        ? receive.open({ asset, accountId })
        : handleWalletModalOpen(),
    [
      accountId,
      asset,
      handleWalletModalOpen,
      isConnected,
      isDemoWallet,
      receive,
      walletSupportsETH,
    ],
  )

  const receiveButtonTranslation = useMemo(
    () => (!isDemoWallet && walletSupportsETH ? 'plugins.foxPage.receive' : 'common.connectWallet'),
    [isDemoWallet, walletSupportsETH],
  )

  const onGetAssetClick = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        provider: DefiProvider.ShapeShift,
        chainId: asset.chainId,
        contractAddress: foxyAddresses[0].staking,
        assetReference: foxyAddresses[0].fox,
        rewardId: foxyAddresses[0].foxy,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [asset.chainId, history, location])

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
                <AssetIcon src={asset.icon} boxSize='16' />
              </Box>
              <SkeletonText isLoaded={Boolean(description?.length)} noOfLines={3}>
                <CText color='gray.500' mb={6}>
                  {trimmedDescription}
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
                {isFoxAsset && (
                  <Button
                    colorScheme={'blue'}
                    mb={2}
                    size='lg'
                    as={Link}
                    leftIcon={<ExternalLinkIcon />}
                    href={BuyFoxCoinbaseUrl}
                    isExternal
                  >
                    <CText>
                      {translate('plugins.foxPage.buyAssetOnCoinbase', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </Button>
                )}
                <Skeleton width='full' isLoaded={Boolean(wallet)}>
                  <Button onClick={handleReceiveClick} width='full' size='lg' colorScheme='gray'>
                    <Text translation={receiveButtonTranslation} />
                  </Button>
                </Skeleton>
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
