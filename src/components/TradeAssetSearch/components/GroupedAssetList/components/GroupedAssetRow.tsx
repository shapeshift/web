import { Box, Button, Flex, Text, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { middleEllipsis } from 'lib/utils'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from 'state/selectors'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
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
  const cryptoPrecisionBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, filter),
  )
  const userCurrencyBalance =
    useAppSelector(s => selectPortfolioUserCurrencyBalanceByAssetId(s, filter)) ?? '0'
  const handleClick = useCallback(() => onClick(asset), [asset, onClick])

  if (!asset) return null

  const hideAssetBalance = !!(hideZeroBalanceAmounts && bnOrZero(cryptoPrecisionBalance).isZero())

  return (
    <Button
      variant='ghost'
      onClick={handleClick}
      justifyContent='space-between'
      isDisabled={!isSupported}
      height={16}
      width='stretch'
      mx={2}
      _focus={focus}
    >
      <Flex gap={4} alignItems='center'>
        <AssetIcon assetId={asset.assetId} size='sm' />
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
          <Flex alignItems='center' gap={2} fontSize='sm' fontWeight='medium' color='text.subtle'>
            {hideAssetBalance ? (
              <>
                <Text color={color}>{asset.symbol}</Text>
                {asset.id && <Text>{middleEllipsis(asset.id)}</Text>}
              </>
            ) : (
              <Amount.Crypto
                fontSize='sm'
                fontWeight='medium'
                value={firstNonZeroDecimal(bnOrZero(cryptoPrecisionBalance)) ?? '0'}
                symbol={asset.symbol}
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
}
