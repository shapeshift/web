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
import { AssetId } from '@shapeshiftoss/caip'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { FoxyPath } from 'features/defi/providers/foxy/components/FoxyManager/FoxyManager'
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { trimWithEndEllipsis } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { selectAccountIdsByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxAssetId, TrimmedDescriptionLength } from '../constants'

type FoxTabProps = {
  assetId: AssetId
}

const GetFoxyModalRoute = FoxyPath.Overview
const GetFoxCoinbaseExternalUrl = `https://www.coinbase.com/price/fox-token`

export const AssetActions: React.FC<FoxTabProps> = ({ assetId }) => {
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { description } = asset || {}
  const query = useGetAssetDescriptionQuery(assetId)
  const isLoaded = !query.isLoading
  const trimmedDescription = trimWithEndEllipsis(description, TrimmedDescriptionLength)
  const isFoxAsset = assetId === FoxAssetId

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

  const onGetAssetClick = () => {
    history.push({
      pathname: GetFoxyModalRoute,
      search: qs.stringify({
        chain: asset.chain,
        contractAddress: foxyAddresses[0].staking,
        tokenId: foxyAddresses[0].fox,
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
                <AssetIcon src={asset.icon} boxSize='16' />
              </Box>
              <SkeletonText isLoaded={isLoaded} noOfLines={3}>
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
                    href={GetFoxCoinbaseExternalUrl}
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
            <TabPanel p={6}></TabPanel>
          </TabPanels>
        </Tabs>
      </Card.Body>
    </Card>
  )
}
