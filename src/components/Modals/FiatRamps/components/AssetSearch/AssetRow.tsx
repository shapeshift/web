import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { ListChildComponentProps } from 'react-window'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import {
  selectAssets,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioFiatBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FiatRampAction } from '../../FiatRampsCommon'

type FiatRampRow = {
  assetIds: AssetId[]
  action: FiatRampAction
  handleClick: (assetId: AssetId) => void
}

export const AssetRow: React.FC<ListChildComponentProps<FiatRampRow>> = ({
  data,
  index,
  style,
}) => {
  const {
    state: { wallet },
  } = useWallet()
  const assetId = data.assetIds[index]
  const assets = useSelector(selectAssets)
  const asset = useMemo(() => assets[assetId], [assets, assetId])
  const filter = useMemo(() => ({ assetId }), [assetId])
  const cryptoHumanBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByAssetId(s, filter),
  )
  const fiatBalance = useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, filter))
  const disabled = useMemo(
    () => !Boolean(wallet && isAssetSupportedByWallet(assetId, wallet)),
    [assetId, wallet],
  )

  const { action, handleClick } = data
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')

  if (!asset) return null

  return (
    <Button
      disabled={disabled}
      variant='ghost'
      onClick={() => handleClick(assetId)}
      justifyContent='space-between'
      alignItems='center'
      style={style}
      _focus={{
        shadow: 'outline-inset',
      }}
    >
      <Box style={{ display: 'flex', flexDirection: 'row' }}>
        <AssetIcon assetId={asset.assetId} size='sm' mr={4} />
        <Box textAlign='left'>
          <Text lineHeight={1}>{asset.name}</Text>
          <Text fontWeight='normal' fontSize='sm' color={color}>
            {asset.symbol}
          </Text>
        </Box>
      </Box>
      {action === FiatRampAction.Sell && cryptoHumanBalance && fiatBalance && (
        <Box textAlign='right'>
          <Amount.Crypto symbol={asset.symbol} value={cryptoHumanBalance} />
          <Amount.Fiat value={fiatBalance} />
        </Box>
      )}
    </Button>
  )
}
