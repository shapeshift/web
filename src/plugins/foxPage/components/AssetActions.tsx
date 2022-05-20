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
import qs from 'qs'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text/Text'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxAssetId } from '../constants'
import { TrimDescriptionWithEllipsis } from '../utils'

type FoxTabProps = {
  assetId: AssetId
  onReceiveClick: () => void
}

export const AssetActions = ({ assetId, onReceiveClick }: FoxTabProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { description } = asset || {}
  const query = useGetAssetDescriptionQuery(assetId)
  const isLoaded = !query.isLoading
  const trimmedDescription = TrimDescriptionWithEllipsis(description)
  const isFoxAsset = assetId === FoxAssetId

  const onGetAssetClick = () => {
    history.push({
      pathname: `/defi/token_staking/ShapeShift/overview`,
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
              <SkeletonText isLoaded={isLoaded} noOfLines={3} textOverflow='ellipsis'>
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
                    href={`https://www.coinbase.com/price/fox-token`}
                    isExternal
                  >
                    <CText>
                      {translate('plugins.foxPage.buyAssetOnCoinbase', {
                        assetSymbol: asset.symbol,
                      })}
                    </CText>
                  </Button>
                )}
                <Button onClick={onReceiveClick} size='lg' colorScheme='gray'>
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
