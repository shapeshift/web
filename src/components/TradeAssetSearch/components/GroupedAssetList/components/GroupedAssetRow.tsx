import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const focus = {
  shadow: 'outline-inset',
}

export type GroupedAssetRowProps = {
  assets: Asset[]
  hideZeroBalanceAmounts: boolean
  index: number
  onAssetClick: (asset: Asset) => void
  onImportClick?: (asset: Asset) => void
}

export const GroupedAssetRow = ({
  index,
  onAssetClick,
  assets,
  hideZeroBalanceAmounts,
  onImportClick,
}: GroupedAssetRowProps) => {
  const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
  const backgroundColor = useColorModeValue('gray.50', 'background.button.secondary.base')
  const translate = useTranslate()
  const {
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const asset = assets[index] as Asset | undefined
  const assetId = asset?.assetId
  // If the asset isn't in the store we are rendering a custom token
  const isAssetInStore = useAppSelector(s => s.assets.ids.some(a => a === assetId))
  const filter = useMemo(() => ({ assetId }), [assetId])
  const isSupported = assetId && wallet && isAssetSupportedByWallet(assetId, wallet)
  const cryptoPrecisionBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )
  const userCurrencyBalance =
    useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'

  const handleAssetClick = useCallback(() => {
    if (!asset) return
    onAssetClick(asset)
  }, [asset, onAssetClick])

  const handleImportClick = useCallback(() => {
    if (!asset) return

    if (onImportClick) {
      onImportClick(asset)
    }
  }, [asset, onImportClick])

  const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoPrecisionBalance).isZero())

  const icon = useMemo(() => {
    if (!(assetId && asset)) return null

    if (asset.icons) return <PairIcons icons={asset.icons} iconSize='sm' showFirst />
    return <AssetIcon assetId={assetId} size='sm' />
  }, [asset, assetId])

  const KnownAssetRow: JSX.Element | null = useMemo(() => {
    if (!asset) return null

    return (
      <Button
        variant='ghost'
        onClick={handleAssetClick}
        justifyContent='space-between'
        isDisabled={!isSupported}
        height={16}
        width='stretch'
        mx={2}
        _focus={focus}
      >
        <Flex
          gap={4}
          alignItems='center'
          maxWidth={
            (isConnected || isDemoWallet) && !hideAssetBalance ? 'calc(100% - 100px)' : '100%'
          }
        >
          {icon}
          <Box textAlign='left' maxWidth='100%' overflow='hidden'>
            <Text
              lineHeight='normal'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              overflow='hidden'
              fontWeight='semibold'
              color='text.base'
            >
              {asset.name}
            </Text>
            <Flex alignItems='center' gap={2} fontSize='sm' fontWeight='medium' color='text.subtle'>
              {hideAssetBalance ? (
                <>
                  <Text overflow='hidden' textOverflow='ellipsis' color={color}>
                    {asset.symbol}
                  </Text>
                  {asset.id && <Text>{middleEllipsis(asset.id)}</Text>}
                </>
              ) : (
                <Amount.Crypto
                  fontSize='sm'
                  fontWeight='medium'
                  value={firstNonZeroDecimal(bnOrZero(cryptoPrecisionBalance)) ?? '0'}
                  symbol={asset.symbol}
                  overflow='hidden'
                  textOverflow='ellipsis'
                />
              )}
            </Flex>
          </Box>
        </Flex>
        {(isConnected || isDemoWallet) && !hideAssetBalance && (
          <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
            <Amount.Fiat
              color='text.base'
              fontWeight='semibold'
              lineHeight='normal'
              value={userCurrencyBalance}
            />
          </Flex>
        )}
      </Button>
    )
  }, [
    asset,
    color,
    cryptoPrecisionBalance,
    handleAssetClick,
    hideAssetBalance,
    icon,
    isConnected,
    isDemoWallet,
    isSupported,
    userCurrencyBalance,
  ])

  const CustomAssetRow: JSX.Element | null = useMemo(() => {
    if (!(asset && assetId)) return null

    return (
      <Button
        variant='ghost'
        justifyContent='space-between'
        isDisabled={!isSupported}
        height={16}
        width='stretch'
        mx={2}
        _focus={focus}
      >
        <Flex gap={4} alignItems='center'>
          <AssetIcon asset={asset} size='sm' />
          <Box textAlign='left'>
            <Text
              lineHeight='normal'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              maxWidth='200px'
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
                <InlineCopyButton value={fromAssetId(assetId).assetReference}>
                  <Text color='text.base'>
                    {middleEllipsis(fromAssetId(assetId).assetReference)}
                  </Text>
                </InlineCopyButton>
              </Flex>
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
          <Button colorScheme='blue' onClick={handleImportClick}>
            {translate('common.import')}
          </Button>
        </Flex>
      </Button>
    )
  }, [asset, assetId, backgroundColor, color, handleImportClick, isSupported, translate])

  return isAssetInStore ? KnownAssetRow : CustomAssetRow
}
