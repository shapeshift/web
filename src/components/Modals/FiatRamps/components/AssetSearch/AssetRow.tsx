import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import type { ListChildComponentProps } from 'react-window'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

import type { FiatRampAsset } from '../../FiatRampsCommon'
import { FiatRampAction } from '../../FiatRampsCommon'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const asset: FiatRampAsset = data.items[index]

  const { type, handleClick } = data
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')

  if (!asset) return null

  return (
    <Button
      disabled={asset.disabled}
      variant='ghost'
      onClick={() => handleClick(asset)}
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
      {type === FiatRampAction.Sell && asset.cryptoBalance && asset.fiatBalance && (
        <Box textAlign='right'>
          <Amount.Crypto symbol={asset.symbol} value={asset.cryptoBalance.toPrecision()} />
          <Amount.Fiat value={asset.fiatBalance.toPrecision()} />
        </Box>
      )}
    </Button>
  )
}
