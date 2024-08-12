import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Box, Center } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { defaultClipPath } from 'components/AssetIcon'
import { LedgerIcon } from 'components/Icons/LedgerIcon'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetOnLedgerProps = {
  assetId: AssetId
} & AvatarProps

export const AssetOnLedger: React.FC<AssetOnLedgerProps> = ({ assetId, size, ...rest }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const ledgerIcon = useMemo(() => <Box as={LedgerIcon} color={'black'} w='55%' h='55%' />, [])

  return (
    <Center>
      <Center position={'relative'}>
        <Avatar
          backgroundColor={'white'}
          position='absolute'
          left='-8%'
          top='-8%'
          transform='scale(0.4)'
          transformOrigin='top left'
          fontSize='inherit'
          icon={ledgerIcon}
          size={size}
        />
        <Avatar src={asset?.icon} border={0} size={size} clipPath={defaultClipPath} {...rest} />
      </Center>
    </Center>
  )
}
