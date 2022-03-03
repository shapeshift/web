import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import { ListChildComponentProps } from 'react-window'
import { AssetIcon } from 'components/AssetIcon'

import { BuySellAction, CurrencyAsset } from '../../BuySell'
import { getAssetLogoUrl } from './helpers/getAssetLogoUrl'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const asset: CurrencyAsset = data.items[index]

  const { type, handleClick } = data
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')

  if (!asset) return null

  return (
    <Button
      variant='ghost'
      onClick={() => handleClick(asset)}
      justifyContent='space-between'
      alignItems='center'
      style={style}
      _focus={{
        shadow: 'outline-inset'
      }}
    >
      <Box style={{ display: 'flex', flexDirection: 'row' }}>
        <AssetIcon src={getAssetLogoUrl(asset)} boxSize='24px' mr={4} />
        <Box textAlign='left'>
          <Text lineHeight={1}>{asset.name}</Text>
          <Text fontWeight='normal' fontSize='sm' color={color}>
            {asset.ticker}
          </Text>
        </Box>
      </Box>
      {type === BuySellAction.Sell && (
        <Box>
          <Text lineHeight={1}>{asset.cryptoBalance}</Text>
        </Box>
      )}
    </Button>
  )
}
