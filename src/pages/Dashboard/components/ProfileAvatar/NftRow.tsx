import type { UseRadioGroupReturn } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { GridChildComponentProps } from 'react-window'
import type { NftItemWithCollection } from 'state/apis/nft/types'

import { AvatarRadio } from './AvatarRadio'

type NftRowProps = {
  filteredNfts: NftItemWithCollection[]
  columnCount: number
  getRadioProps: UseRadioGroupReturn['getRadioProps']
}

export const NftRow: React.FC<GridChildComponentProps<NftRowProps>> = ({
  columnIndex,
  rowIndex,
  style,
  data: { filteredNfts, columnCount, getRadioProps },
}) => {
  const item = filteredNfts[rowIndex * columnCount + columnIndex]
  if (!item) return null
  const { assetId, medias } = item
  const mediaUrl = medias?.[0]?.originalUrl
  return (
    <Box key={assetId} style={style} p={2}>
      <AvatarRadio src={mediaUrl} {...getRadioProps({ value: assetId })} />
    </Box>
  )
}
