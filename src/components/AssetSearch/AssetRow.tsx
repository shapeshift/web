import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useParams } from 'react-router-dom'
import { ListChildComponentProps } from 'react-window'
import { AssetIcon } from 'components/AssetIcon'
import { MatchParams } from 'pages/Accounts/Account'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const { assetId: searchedAssetId } = useParams<MatchParams>()
  const parsedAssetId = searchedAssetId ? decodeURIComponent(searchedAssetId) : undefined
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')
  const asset: Asset = data.items[index]
  if (!asset) return null

  const { handleClick } = data
  const isActive = asset.assetId === parsedAssetId

  return (
    <Button
      variant='ghost'
      onClick={() => handleClick(asset)}
      isActive={isActive}
      justifyContent='flex-start'
      style={style}
      _focus={{
        shadow: 'outline-inset',
      }}
    >
      <AssetIcon src={asset?.icon} boxSize='24px' mr={4} />
      <Box textAlign='left'>
        <Text lineHeight={1}>{asset.name}</Text>
        <Text fontWeight='normal' fontSize='sm' color={color}>
          {asset.symbol}
        </Text>
      </Box>
    </Button>
  )
}
