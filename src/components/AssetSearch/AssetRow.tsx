import { Box, Button, Text, useColorModeValue } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { useRouteMatch } from 'react-router-dom'
import { ListChildComponentProps } from 'react-window'
import { AssetIcon } from 'components/AssetIcon'

export const AssetRow: React.FC<ListChildComponentProps> = ({ data, index, style }) => {
  const match = useRouteMatch<{ address: string; network: string }>()
  const color = useColorModeValue('gray.500', 'whiteAlpha.500')
  const asset: Asset = data.items[index]
  if (!asset) return null

  const { handleClick } = data
  const { assetReference } = fromAssetId(asset.assetId)

  const active =
    !match?.params?.address && !assetReference
      ? match?.params?.network === asset?.chain
      : match?.params?.address === assetReference

  if (!asset) return null

  return (
    <Button
      variant='ghost'
      onClick={() => handleClick(asset)}
      isActive={active}
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
