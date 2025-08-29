import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
	Box,
	Button,
	Collapse,
	Text as CText,
	Flex,
	Icon,
	Tag,
	TagLeftIcon,
	useColorModeValue,
	useDisclosure,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'

import { AssetRow } from './AssetRow'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
	selectFeeAssetById,
	selectMarketDataByAssetIdUserCurrency,
	selectPortfolioCryptoPrecisionBalanceByFilter,
	selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

export const GroupedAssetRow: FC<{
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  showPrice?: boolean
}> = ({ assets, handleClick, disableUnsupported, hideZeroBalanceAmounts, showPrice }) => {
  const { isOpen, onToggle } = useDisclosure()

  const titleColor = useColorModeValue('black', 'white')
  const firstAsset = useMemo(() => assets[0], [assets])

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, firstAsset.assetId))

  const primaryAsset = useMemo(() => {
    const assetWithoutChainSuffix = assets.find(
      asset => asset.name.includes(' on ') || feeAsset?.assetId === asset.assetId,
    )
    return assetWithoutChainSuffix || assets[0]
  }, [assets, feeAsset])

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, primaryAsset.assetId ?? ''),
  )

  const primaryAssetNameWithoutChain = useMemo(() => {
    return primaryAsset.name.split(' on ')[0]
  }, [primaryAsset.name])

  const totalBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const filter = { assetId: asset.assetId }
      const balance = selectPortfolioUserCurrencyBalanceByAssetId(store.getState(), filter) ?? '0'
      return sum + bnOrZero(balance).toNumber()
    }, 0)
  }, [assets])

  const totalBalanceBaseUnit = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const filter = { assetId: asset.assetId }
      const balance = selectPortfolioCryptoPrecisionBalanceByFilter(store.getState(), filter) ?? '0'
      return bnOrZero(balance).plus(sum).toFixed()
    }, '0')
  }, [assets])

  const handleGroupClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggle()
    },
    [onToggle],
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      handleClick(asset)
    },
    [handleClick],
  )

  const assetIcons = useMemo(() => {
    return assets.map(asset => (
      <Box
        key={asset.chainId}
        w={2}
        borderRadius='full'
        display='flex'
        alignItems='center'
        justifyContent='center'
        fontSize='xs'
        color='white'
        fontWeight='bold'
      >
        <LazyLoadAvatar src={asset.networkIcon ?? asset?.icon} boxSize={4} />
      </Box>
    ))
  }, [assets])

  const changePercent24Hr = marketData?.changePercent24Hr

  const changePercentTagColorsScheme = useMemo(() => {
    if (bnOrZero(changePercent24Hr).gt(0)) {
      return 'green'
    }

    if (bnOrZero(changePercent24Hr).lt(0)) {
      return 'red'
    }

    return 'gray'
  }, [changePercent24Hr])

  const priceChange = useMemo(() => {
    if (!changePercent24Hr) return null

    return (
      <Tag colorScheme={changePercentTagColorsScheme} width='max-content' px={1} size='sm'>
        {changePercentTagColorsScheme !== 'gray' ? (
          <TagLeftIcon
            as={changePercentTagColorsScheme === 'green' ? RiArrowRightUpLine : RiArrowLeftDownLine}
            me={1}
          />
        ) : null}
        <Amount.Percent
          value={bnOrZero(changePercent24Hr).times('0.01').toString()}
          fontSize='xs'
        />
      </Tag>
    )
  }, [changePercent24Hr, changePercentTagColorsScheme])

  return (
    <Box bg={isOpen ? 'background.surface.raised.base' : 'transparent'} borderRadius='lg'>
      <Button
        variant='ghost'
        onClick={handleGroupClick}
        justifyContent='space-between'
        width='100%'
        height='auto'
        minHeight='60px'
        padding={4}
        py={2}
        pr={2}
        borderBottomRadius={isOpen ? 0 : 'lg'}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon
            assetId={primaryAsset.assetId}
            showNetworkIcon={false}
            size='sm'
            flexShrink={0}
          />
          <Box textAlign='left' flex={1} minWidth={0}>
            <CText
              lineHeight={1}
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              color={titleColor}
            >
              {primaryAssetNameWithoutChain}
            </CText>
            <Flex alignItems='center' gap={2}>
              {!showPrice ? (
                <Amount.Crypto
                  color='text.secondary'
                  fontSize='sm'
                  value={totalBalanceBaseUnit}
                  symbol={primaryAsset.symbol}
                />
              ) : (
                <CText
                  fontWeight='normal'
                  fontSize='sm'
                  color={'text.subtle'}
                  textOverflow='ellipsis'
                  whiteSpace='nowrap'
                  maxWidth='150px'
                  overflow='hidden'
                >
                  {primaryAsset.symbol}
                </CText>
              )}
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
          {showPrice ? (
            <Flex gap={1} mt={1}>
              <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' gap={1}>
                <Amount.Fiat
                  fontWeight='semibold'
                  color={titleColor}
                  lineHeight='shorter'
                  height='20px'
                  value={marketData?.price}
                />
                {priceChange}
              </Flex>
            </Flex>
          ) : (
            <Flex gap={1} flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
              <Amount.Fiat
                color='var(--chakra-colors-chakra-body-text)'
                value={totalBalance.toString()}
              />
              <Flex>{assetIcons}</Flex>
            </Flex>
          )}
        </Flex>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} ml={2} />
      </Button>

      <Collapse in={isOpen}>
        {assets.map(asset => (
          <AssetRow
            key={asset.assetId}
            asset={asset}
            index={0}
            py={8}
            // eslint-disable-next-line react-memo/require-usememo
            data={{
              assets: [asset],
              handleClick: handleAssetClick,
              disableUnsupported,
              hideZeroBalanceAmounts,
            }}
          />
        ))}
      </Collapse>
    </Box>
  )
}
