import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Collapse, Text as CText, Flex, Icon, useDisclosure } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { AssetRow } from './AssetRow'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
	selectPortfolioCryptoPrecisionBalanceByFilter,
	selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { store } from '@/state/store'

export const GroupedAssetRow: FC<{
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
}> = ({ assets, handleClick, disableUnsupported, hideZeroBalanceAmounts }) => {
  const { isOpen, onToggle } = useDisclosure()
  const primaryAsset = assets[0]

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

  return (
    <Box>
      <Button
        variant='ghost'
        onClick={handleGroupClick}
        justifyContent='space-between'
        width='100%'
        height='auto'
        minHeight='60px'
        padding={4}
      >
        <Flex gap={4} alignItems='center' flex={1} minWidth={0}>
          <AssetIcon assetId={primaryAsset.assetId} size='sm' flexShrink={0} />
          <Box textAlign='left' flex={1} minWidth={0}>
            <CText lineHeight={1} textOverflow='ellipsis' whiteSpace='nowrap' overflow='hidden'>
              {primaryAsset.name}
            </CText>
            <Flex alignItems='center' gap={2}>
              <Amount.Crypto
                color='text.secondary'
                fontSize='sm'
                value={totalBalanceBaseUnit}
                symbol={primaryAsset.symbol}
              />
            </Flex>
          </Box>
        </Flex>
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end' flexShrink={0}>
          <Amount.Fiat
            color='var(--chakra-colors-chakra-body-text)'
            value={totalBalance.toString()}
          />

          <Flex gap={1} mt={1}>
            {assets.map(asset => (
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
            ))}
          </Flex>
        </Flex>
        <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} ml={2} />
      </Button>

      <Collapse in={isOpen}>
        <Box pl={8}>
          {assets.map(asset => (
            <AssetRow
              key={asset.assetId}
              asset={asset}
              index={0}
              // eslint-disable-next-line react-memo/require-usememo
              data={{
                assets: [asset],
                handleClick: handleAssetClick,
                disableUnsupported,
                hideZeroBalanceAmounts,
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
