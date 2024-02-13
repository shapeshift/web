import type { AvatarProps } from '@chakra-ui/react'
import { Center } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TransferType } from '@shapeshiftoss/unchained-client'
import uniqBy from 'lodash/uniqBy'
import type { PropsWithChildren } from 'react'
import React, { useMemo } from 'react'
import { LuGlobe } from 'react-icons/lu'
import { type Transfer } from 'hooks/useTxDetails/useTxDetails'

import {
  AssetIcon,
  bottomClipPath,
  defaultClipPath,
  squareClipPath,
  topClipPath,
} from './AssetIcon'

const StatusStyle = { svg: { width: '0.95em', height: '0.95em' } }

type AssetIconWithBadgeProps = {
  size?: AvatarProps['size']
  assetId?: AssetId
  transfersByType: Record<TransferType, Transfer[]>
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
    return Object.values(transfersByType)
      .flat()
      .some(transfer => !!transfer.id)
  }, [transfersByType])
  const WebIcon = useMemo(() => <LuGlobe />, [])
  const txData = useMemo(
    () => uniqBy(Object.values(transfersByType).flat(), 'assetId'),
    [transfersByType],
  )

  const renderIcons = useMemo(() => {
    if (!txData) return null

    return txData.map((transfer, index) => {
      const compareIndex = index + 1
      let overideClipPath
      if (isNft) {
        overideClipPath = squareClipPath
      }
      if (txData.length > 1) {
        overideClipPath = topClipPath
      }
      if (compareIndex === 2) {
        overideClipPath = bottomClipPath
      }
      if (txData.length > 2 && compareIndex === 3) return null
      return (
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
        />
      )
    })
  }, [isNft, size, txData])
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
    if (type === '' && txData.length === 0) {
      return (
        <AssetIcon size={size} icon={WebIcon} clipPath={defaultClipPath} color='text.subtlest' />
      )
    }
    return renderIcons
  }, [WebIcon, assetId, renderIcons, size, txData.length, type])
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
