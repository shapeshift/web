import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import { BuySellAsset } from 'features/buysell/contexts/BuySellManagerProvider/BuySellManagerProvider'
import { ListChildComponentProps } from 'react-window'
import { AssetIcon } from 'components/AssetIcon'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const asset: BuySellAsset = data.items[index]

  const { handleClick } = data
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')

  if (!asset) return null

  return (
    <Button
      variant='ghost'
      onClick={() => handleClick(asset)}
      justifyContent='flex-start'
      style={style}
      _focus={{
        shadow: 'outline-inset'
      }}
    >
      <AssetIcon src={asset?.source} boxSize='24px' mr={4} />
      <Box textAlign='left'>
        <Text lineHeight={1}>{asset.name}</Text>
        <Text fontWeight='normal' fontSize='sm' color={color}>
          {asset.ticker}
        </Text>
      </Box>
    </Button>
  )
}
