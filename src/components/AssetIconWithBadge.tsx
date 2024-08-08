import type { AvatarProps } from '@chakra-ui/react'
import { Box, Center, Image } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TransferType } from '@shapeshiftoss/unchained-client'
import uniqBy from 'lodash/uniqBy'
import type { PropsWithChildren } from 'react'
import React, { useMemo } from 'react'
import { LuGlobe } from 'react-icons/lu'
import FlipShadow from 'assets/flip-shadow.svg'
import { type Transfer } from 'hooks/useTxDetails/useTxDetails'

import {
  AssetIcon,
  bottomClipPath,
  defaultClipPath,
  squareClipPath,
  topClipPath,
} from './AssetIcon'

const StatusStyle = { svg: { transform: 'scale(0.8)' } }

type AssetIconWithBadgeProps = {
  size?: AvatarProps['size']
  assetId?: AssetId
  transfersByType?: Record<TransferType, Transfer[]>
  type?: string
} & PropsWithChildren

export const AssetIconWithBadge: React.FC<AssetIconWithBadgeProps> = ({
  size,
  assetId,
  transfersByType,
  type,
  children,
}) => {
  const isNft = useMemo(() => {
    return Boolean(
      transfersByType &&
        Object.values(transfersByType)
          .flat()
          .some(transfer => !!transfer.id),
    )
  }, [transfersByType])
  const WebIcon = useMemo(() => <LuGlobe />, [])
  const transfers = useMemo(
    () => (transfersByType ? uniqBy(Object.values(transfersByType).flat(), 'assetId') : []),
    [transfersByType],
  )

  const renderIcons = useMemo(() => {
    if (!transfers) return null

    return transfers.map((transfer, index) => {
      const compareIndex = index + 1
      let overideClipPath
      if (isNft) {
        overideClipPath = squareClipPath
      }
      if (transfers.length > 1) {
        overideClipPath = topClipPath
      }
      if (compareIndex === 2) {
        overideClipPath = bottomClipPath
      }
      if (transfers.length > 2 && compareIndex === 3) return null
      return (
        <Box key={index}>
          {compareIndex === 2 && (
            <Image
              src={FlipShadow}
              position='absolute'
              width='100%'
              height='100%'
              left={0}
              top={0}
              zIndex={2}
            />
          )}

          <AssetIcon
            showNetworkIcon={false}
            key={transfer.assetId}
            assetId={transfer.assetId}
            clipPath={overideClipPath ? overideClipPath : defaultClipPath}
            name={transfer.asset.name}
            size={size}
            position={compareIndex === 2 ? 'absolute' : 'static'}
            borderRadius={isNft ? 0 : 'full'}
            left={0}
            top={0}
          />
        </Box>
      )
    })
  }, [isNft, size, transfers])
  const renderIcon = useMemo(() => {
    if (assetId) {
      return (
        <AssetIcon
          showNetworkIcon={false}
          assetId={assetId}
          clipPath={defaultClipPath}
          size={size}
        />
      )
    }
    if (type === '' && transfers.length === 0) {
      return (
        <AssetIcon size={size} icon={WebIcon} clipPath={defaultClipPath} color='text.subtlest' />
      )
    }
    return renderIcons
  }, [WebIcon, assetId, renderIcons, size, transfers.length, type])
  return (
    <>
      <Center position='relative'>
        <Center
          position='absolute'
          left='-8%'
          top='-8%'
          boxSize='40%'
          sx={StatusStyle}
          color='white'
        >
          {children}
        </Center>
        {renderIcon}
      </Center>
    </>
  )
}
