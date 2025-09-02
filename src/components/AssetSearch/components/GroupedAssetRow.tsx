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
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from '@/state/store'

type GroupedAssetRowProps = {
  asset: Asset
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  showPrice?: boolean
  onLongPress?: (asset: Asset) => void
}

export const GroupedAssetRow: FC<GroupedAssetRowProps> = ({
  asset,
  handleClick,
  disableUnsupported,
  hideZeroBalanceAmounts,
  showPrice,
  onLongPress,
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const assets = useAppSelector(selectAssets)
  const {
    state: { isConnected },
  } = useWallet()

  const relatedAssetIdsFilter = useMemo(
    () => ({
      assetId: asset.assetId,
      // We want all related assetIds, and conditionally mark the disconnected/unsupported ones as
      // disabled in the UI. This allows users to see our product supports more assets than they
      // have connected chains for.
      onlyConnectedChains: false,
    }),
    [asset],
  )
  const relatedAssetIds = useSelectorWithArgs(
    selectRelatedAssetIdsInclusiveSorted,
    relatedAssetIdsFilter,
  )

  const relatedAssets = useMemo(() => {
    return relatedAssetIds.map(assetId => assets[assetId]).filter(isSome)
  }, [assets, relatedAssetIds])

  const titleColor = useColorModeValue('black', 'white')

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.assetId))

  const primaryAsset = useMemo(() => {
    const assetWithoutChainSuffix = relatedAssets.find(
      relatedAsset =>
        relatedAsset?.name.includes(' on ') || feeAsset?.assetId === relatedAsset?.assetId,
    )
    return assetWithoutChainSuffix || asset
  }, [relatedAssets, feeAsset, asset])

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, primaryAsset.assetId ?? ''),
  )

  const primaryAssetNameWithoutChain = useMemo(() => {
    return primaryAsset.name.split(' on ')[0]
  }, [primaryAsset.name])

  const relatedFiatBalances = useAppSelector(state =>
    relatedAssetIds.map(
      id => selectPortfolioUserCurrencyBalanceByAssetId(state, { assetId: id }) ?? '0',
    ),
  )
  const totalBalanceUserCurrency = useMemo(
    () => relatedFiatBalances.reduce((sum, v) => bnOrZero(sum).plus(v).toString(), '0'),
    [relatedFiatBalances],
  )

  const relatedCryptoBalances = useAppSelector(state =>
    relatedAssetIds.map(id =>
      selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: id }),
    ),
  )
  const totalBalanceCryptoHuman = useMemo(
    () => relatedCryptoBalances.reduce((sum, v) => bnOrZero(sum).plus(v).toString(), '0'),
    [relatedCryptoBalances],
  )

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

  const feeAssets = useAppSelector(state =>
    relatedAssets.map(a => selectFeeAssetByChainId(state, a.chainId)),
  )

  const networksIcons = useMemo(() => {
    return relatedAssets.map((asset, i) => {
      const feeAsset = feeAssets[i]
      return (
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
          <LazyLoadAvatar src={feeAsset?.networkIcon ?? feeAsset?.icon} boxSize={4} />
        </Box>
      )
    })
  }, [relatedAssets, feeAssets])

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
    <Box bg={isOpen ? 'background.surface.raised.base' : 'transparent'} borderRadius='lg' my={2}>
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
        bg={isOpen ? 'background.surface.raised.base' : 'transparent'}
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
                  value={totalBalanceCryptoHuman}
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
          {showPrice && (
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
          )}

          {!showPrice &&
            isConnected &&
            ((bnOrZero(totalBalanceCryptoHuman).gt(0) && hideZeroBalanceAmounts) ||
              !hideZeroBalanceAmounts) && (
              <Flex gap={1} flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
                <Amount.Fiat
                  color='var(--chakra-colors-chakra-body-text)'
                  value={totalBalanceUserCurrency.toString()}
                />
                <Flex>{networksIcons}</Flex>
              </Flex>
            )}
        </Flex>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} ml={2} />
      </Button>

      <Collapse in={isOpen} unmountOnExit>
        {relatedAssets.map(asset => (
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
              handleLongPress: onLongPress,
            }}
          />
        ))}
      </Collapse>
    </Box>
  )
}
