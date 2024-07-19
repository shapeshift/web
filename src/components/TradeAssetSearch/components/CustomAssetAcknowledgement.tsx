import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Checkbox,
  Flex,
  Link,
  type ResponsiveValue,
  Text,
  useBreakpointValue,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type * as CSS from 'csstype'
import { type PropsWithChildren, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { AssetIcon } from 'components/AssetIcon'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { useToggle } from 'hooks/useToggle/useToggle'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { middleEllipsis } from 'lib/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import {
  defaultMarketData,
  marketData as marketDataSlice,
} from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

import { getTokenMarketData } from '../hooks/useGetCustomTokenPriceQuery'

const externalLinkIcon = <ExternalLinkIcon paddingLeft={'4px'} />

type CustomAssetAcknowledgementProps = {
  asset: Asset | undefined
  handleAssetClick: (asset: Asset) => void
  shouldShowWarningAcknowledgement: boolean
  setShouldShowWarningAcknowledgement: (shouldShow: boolean) => void
} & PropsWithChildren

const extractAndCapitalizeDomain = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const hostParts = urlObj.hostname.split('.')
    const domain = hostParts[hostParts.length - 2]

    if (domain === undefined) {
      return ''
    }

    return domain.charAt(0).toUpperCase() + domain.slice(1)
  } catch (error) {
    console.error('Invalid URL:', error)
    return ''
  }
}

export const CustomAssetAcknowledgement: React.FC<CustomAssetAcknowledgementProps> = ({
  children,
  asset,
  handleAssetClick,
  shouldShowWarningAcknowledgement,
  setShouldShowWarningAcknowledgement,
}) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const color = useColorModeValue('text.subtle', 'whiteAlpha.500')

  const [hasAcknowledged, toggleHasAcknowledged] = useToggle(false)

  const onImportClick = useCallback(async () => {
    if (!asset) return

    getMixPanel()?.track(MixPanelEvent.CustomAssetAdded, {
      asset,
    })

    // Add asset to the store
    dispatch(assetsSlice.actions.upsertAsset(asset))

    try {
      const usdMarketData = await getTokenMarketData(asset.assetId)
      if (usdMarketData) {
        // Add market data to the store
        dispatch(
          marketDataSlice.actions.setCryptoMarketData({
            [asset.assetId]: {
              price: usdMarketData.price.toString(),
              marketCap: usdMarketData.market_cap.toString(),
              volume: '0', // Not available from Zerion
              changePercent24Hr: usdMarketData.changes.percent_1d,
            },
          }),
        )
      }
    } catch (error) {
      // Else add an empty market data object to the store so it shows up in the asset search
      dispatch(marketDataSlice.actions.setCryptoMarketData({ [asset.assetId]: defaultMarketData }))
    } finally {
      // Once the custom asset is in the store, proceed as if it was a normal asset
      handleAssetClick(asset)
    }
  }, [dispatch, handleAssetClick, asset])

  const checkboxTextColor = useColorModeValue('gray.800', 'gray.50')
  const backgroundColor = useColorModeValue('gray.100', 'darkNeutralAlpha.700')
  const flexDirection: ResponsiveValue<CSS.Property.FlexDirection> | undefined = useBreakpointValue(
    {
      base: 'column',
      sm: 'row',
    },
  )

  const CustomAssetRow: JSX.Element | null = useMemo(() => {
    if (!asset) return null
    return (
      <Flex
        borderRadius={'xl'}
        px={4}
        justifyContent='space-between'
        alignItems='center'
        width='100%'
        background={backgroundColor}
        flexDirection={flexDirection}
      >
        <Flex gap={4} alignItems='center' padding={4}>
          <AssetIcon assetId={asset.assetId} size='sm' />
          <Box textAlign='left'>
            <Text
              lineHeight='normal'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              width={'100%'}
              overflow='hidden'
              fontWeight='semibold'
              color='text.base'
            >
              {asset.name}
            </Text>
            <Flex
              alignItems='center'
              gap={2}
              fontSize='sm'
              fontWeight='medium'
              color='text.subtle'
              mt={2}
            >
              <Text color={color}>{asset.symbol}</Text>
              <Flex background={backgroundColor} borderRadius={'lg'} pl={3}>
                <InlineCopyButton value={fromAssetId(asset.assetId).assetReference}>
                  <Text color='text.base'>
                    {middleEllipsis(fromAssetId(asset.assetId).assetReference)}
                  </Text>
                </InlineCopyButton>
              </Flex>
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' padding={'4px'}>
          <Link
            isExternal
            href={`${asset.explorerAddressLink}${fromAssetId(asset.assetId).assetReference}`}
          >
            {extractAndCapitalizeDomain(asset.explorerAddressLink)}
            {externalLinkIcon}
          </Link>
        </Flex>
      </Flex>
    )
  }, [asset, backgroundColor, color, flexDirection])

  const Content: JSX.Element = useMemo(
    () => (
      <Center flexDir={'column'}>
        <Box py={4} textAlign='center' color={checkboxTextColor}>
          <Checkbox onChange={toggleHasAcknowledged} fontWeight='bold' py={2}>
            {translate('customTokenAcknowledgement.understand')}
          </Checkbox>
        </Box>
        {CustomAssetRow}
      </Center>
    ),
    [CustomAssetRow, checkboxTextColor, toggleHasAcknowledged, translate],
  )

  return (
    <WarningAcknowledgement
      message={translate('warningAcknowledgement.customToken')}
      buttonTranslation='common.import'
      onAcknowledge={onImportClick}
      shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
      setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      disableButton={!hasAcknowledged}
      content={Content}
    >
      {children}
    </WarningAcknowledgement>
  )
}
