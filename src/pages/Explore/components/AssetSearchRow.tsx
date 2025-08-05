import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, Tag, TagLeftIcon, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import type { ListChildComponentProps } from 'react-window'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import type { AssetData } from '@/components/AssetSearch/components/AssetList'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { middleEllipsis } from '@/lib/utils'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { isAssetSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const focus = {
  shadow: 'outline-inset',
}

const assetIconPairProps = {
  showFirst: true,
}

type AssetSearchRowProps = ListChildComponentProps<AssetData> &
  ButtonProps & {
    showNetworkIcon?: boolean
    portalsAssets?: PortalsAssets
  }

export const AssetSearchRow: FC<AssetSearchRowProps> = memo(
  ({
    data: { handleClick, disableUnsupported, assets },
    index,
    style,
    showNetworkIcon,
    portalsAssets,
    ...rest
  }) => {
    const translate = useTranslate()
    const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
    const textColor = useColorModeValue('black', 'white')
    const {
      state: { wallet },
    } = useWallet()
    const asset: Asset | undefined = assets[index]
    const assetId = asset?.assetId
    const isSupported = wallet && isAssetSupportedByWallet(assetId ?? '', wallet)
    const handleOnClick = useCallback(() => handleClick(asset), [asset, handleClick])
    const portalAsset = portalsAssets?.byId[assetId]

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
    )
    const changePercent24Hr = marketData?.changePercent24Hr

    const priceChange = useMemo(() => {
      if (!changePercent24Hr) return null

      const isPriceChangePositive = bnOrZero(changePercent24Hr).gte(0)

      return (
        <Tag
          colorScheme={isPriceChangePositive ? 'green' : 'red'}
          width='max-content'
          px={1}
          size='sm'
        >
          <TagLeftIcon
            as={isPriceChangePositive ? RiArrowRightUpLine : RiArrowLeftDownLine}
            me={1}
          />
          <Amount.Percent
            value={bnOrZero(changePercent24Hr).times(0.01).toString()}
            fontSize='xs'
          />
        </Tag>
      )
    }, [changePercent24Hr])

    const rightContent = useMemo(() => {
      if (portalAsset) {
        const volume = bnOrZero(marketData?.volume)

        return (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
            <Amount.Percent
              value={bnOrZero(portalAsset.metrics.apy).times(0.01).toString()}
              fontSize='xs'
              suffix={translate('common.apy')}
            />
            <Tag colorScheme={'green'} width='max-content' px={1} size='sm'>
              <Amount.Fiat
                value={volume.toString()}
                fontSize='xs'
                suffix={translate('common.vol')}
              />
            </Tag>
          </Flex>
        )
      }

      return (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
          <Amount.Fiat
            fontWeight='semibold'
            color={textColor}
            lineHeight='shorter'
            height='20px'
            value={marketData?.price}
          />
          {priceChange}
        </Flex>
      )
    }, [marketData?.price, priceChange, textColor, marketData?.volume, portalAsset, translate])

    if (!asset) return null

    return (
      <Button
        variant='ghost'
        onClick={handleOnClick}
        justifyContent='space-between'
        isDisabled={!isSupported && disableUnsupported}
        style={style}
        _focus={focus}
        {...rest}
      >
        <Flex gap={4} alignItems='center'>
          <AssetIcon
            assetId={asset.assetId}
            size='sm'
            pairProps={assetIconPairProps}
            showNetworkIcon={showNetworkIcon}
          />
          <Box textAlign='left'>
            <Text
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              maxWidth='150px'
              overflow='hidden'
            >
              {asset.name}
            </Text>
            <Flex alignItems='center' gap={2}>
              <Text fontWeight='normal' fontSize='sm' color={color}>
                {asset.symbol}
              </Text>
              {asset.id && (
                <Text fontWeight='normal' fontSize='sm' color={color}>
                  {middleEllipsis(asset.id)}
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
          {rightContent}
        </Flex>
      </Button>
    )
  },
)
