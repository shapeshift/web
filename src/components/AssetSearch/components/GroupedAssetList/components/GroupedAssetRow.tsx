import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
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
  onClick: (asset: Asset) => void
}

export const GroupedAssetRow = ({
  index,
  onClick,
  assets,
  hideZeroBalanceAmounts,
}: GroupedAssetRowProps) => {
  const color = useColorModeValue('text.subtle', 'whiteAlpha.500')
  const {
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()
  const asset: Asset | undefined = assets[index]
  const assetId = asset?.assetId
  const filter = useMemo(() => ({ assetId }), [assetId])
  const isSupported = assetId && wallet && isAssetSupportedByWallet(assetId, wallet)
  const cryptoHumanBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )
  const userCurrencyBalance =
    useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'
  const handleClick = useCallback(() => onClick(asset), [asset, onClick])

  if (!asset) return null

  const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoHumanBalance).isZero())

  return (
    <Button
      variant='ghost'
      onClick={handleClick}
      justifyContent='space-between'
      isDisabled={!isSupported}
      height={16}
      width='100%'
      _focus={focus}
    >
      <Flex gap={4} alignItems='center'>
        <AssetIcon assetId={asset.assetId} size='sm' />
        <Box textAlign='left'>
          <Text
            lineHeight={1}
            textOverflow='ellipsis'
            whiteSpace='nowrap'
            maxWidth='200px'
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
      {(isConnected || isDemoWallet) && !hideAssetBalance && (
        <Flex flexDir='column' justifyContent='flex-end' alignItems='flex-end'>
          <Amount.Fiat color='var(--chakra-colors-chakra-body-text)' value={userCurrencyBalance} />
          <Amount.Crypto
            fontSize='sm'
            fontWeight='normal'
            value={firstNonZeroDecimal(bnOrZero(cryptoHumanBalance)) ?? '0'}
            symbol={asset.symbol}
          />
        </Flex>
      )}
    </Button>
  )
}
