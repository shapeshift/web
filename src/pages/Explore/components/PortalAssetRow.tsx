import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLongPress } from 'use-long-press'

import { Amount } from '@/components/Amount/Amount'
import { WatchAssetButton } from '@/components/AssetHeader/WatchAssetButton'
import { AssetIcon } from '@/components/AssetIcon'
import type { AssetData } from '@/components/AssetSearch/components/AssetList'
import { defaultLongPressConfig, longPressSx } from '@/constants/longPress'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { middleEllipsis } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { isAssetSupportedByWallet } from '@/state/slices/portfolioSlice/utils'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const focus = {
  shadow: 'outline-inset',
}

type PortalAssetRowProps = {
  asset: Asset
  index: number
  data: AssetData
  showNetworkIcon?: boolean
  portalsAssets?: PortalsAssets
} & ButtonProps

export const PortalAssetRow: FC<PortalAssetRowProps> = memo(
  ({
    asset,
    data: { handleClick, handleLongPress, disableUnsupported, portalsAssets },
    showNetworkIcon,
    ...rest
  }) => {
    const translate = useTranslate()
    const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
    const longPressHandlers = useLongPress((_, { context: row }) => {
      vibrate('heavy')
      handleLongPress?.(row as Asset)
    }, defaultLongPressConfig)

    const {
      state: { wallet },
    } = useWallet()
    const assetId = asset?.assetId
    const isSupported = wallet && isAssetSupportedByWallet(assetId ?? '', wallet)
    const handleOnClick = useCallback(() => handleClick(asset), [asset, handleClick])
    const portalAsset = portalsAssets?.byId[assetId]

    const marketData = useAppSelector(state =>
      selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
    )

    const rightContent = useMemo(() => {
      if (!portalAsset) return null
      const volume = bnOrZero(marketData?.volume)

      return (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
          <Amount.Percent
            value={bnOrZero(portalAsset.metrics.apy).times('0.01').toString()}
            fontSize='xs'
            suffix={translate('common.apy')}
            color='green.500'
            fontWeight='bold'
          />
          <Amount.Fiat
            value={volume.toString()}
            fontSize='xs'
            suffix={translate('common.volumeShort')}
            color={color}
          />
        </Flex>
      )
    }, [marketData?.volume, portalAsset, translate, color])

    if (!asset) return null

    return (
      <Button
        variant='ghost'
        onClick={handleOnClick}
        justifyContent='space-between'
        isDisabled={!isSupported && disableUnsupported}
        _focus={focus}
        height='auto'
        width='100%'
        minHeight='60px'
        padding={4}
        {...rest}
        {...longPressHandlers(asset)}
        sx={longPressSx}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={asset.assetId} size='sm' showNetworkIcon={showNetworkIcon} />
          <Box textAlign='left' flex={1} minWidth={0}>
            <Text
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              width='100%'
            >
              {asset.name}
            </Text>
            <Flex alignItems='center' gap={2}>
              <Text
                fontWeight='normal'
                fontSize='sm'
                color={color}
                textOverflow='ellipsis'
                whiteSpace='nowrap'
                maxWidth='150px'
                overflow='hidden'
              >
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

        <HStack>
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
            {rightContent}
          </Flex>
          <WatchAssetButton bg='transparent' assetId={asset.assetId} />
        </HStack>
      </Button>
    )
  },
)
