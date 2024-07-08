import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Center, Checkbox, Flex, Link, Text, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { type PropsWithChildren, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { AssetIcon } from 'components/AssetIcon'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { useToggle } from 'hooks/useToggle/useToggle'
import { middleEllipsis } from 'lib/utils'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

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

  const onImportClick = useCallback(() => {
    if (!asset) return

    // Add asset to the store
    dispatch(assetsSlice.actions.upsertAsset(asset))

    // Add market data to the store
    dispatch(
      marketDataSlice.actions.setCryptoMarketData({
        [asset.assetId]: { price: '0', marketCap: '0', volume: '0', changePercent24Hr: 0 },
      }),
    )

    // Once the custom asset is in the store, proceed as if it was a normal asset
    handleAssetClick(asset)
  }, [dispatch, handleAssetClick, asset])

  const checkboxTextColor = useColorModeValue('gray.800', 'gray.50')
  const backgroundColor = useColorModeValue('gray.100', 'darkNeutralAlpha.700')
  const CustomAssetRow: JSX.Element | null = useMemo(() => {
    if (!asset) return null
    return (
      <Flex
        borderRadius={'xl'}
        padding={4}
        justifyContent='space-between'
        alignItems='center'
        height={20}
        width='stretch'
        background={backgroundColor}
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
  }, [asset, backgroundColor, color])

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
