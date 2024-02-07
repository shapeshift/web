// ImageInSvg.tsx
import type { AvatarProps } from '@chakra-ui/react'
import { Center } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { TradeType, TransferType } from '@shapeshiftoss/unchained-client'
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

const StatusStyle = { svg: { width: '76%', height: '76%' } }

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
  const txData = useMemo(() => {
    switch (type) {
      case TransferType.Send:
        return transfersByType?.Send ? [...transfersByType.Send] : []
      case TransferType.Receive:
        return transfersByType?.Receive ? [...transfersByType.Receive] : []
      case TradeType.Trade:
      case TradeType.Swap:
      case TradeType.Refund:
        return [...(transfersByType?.Send || []), ...(transfersByType?.Receive || [])]
      case 'method':
        return transfersByType?.Contract ? [...transfersByType.Contract] : []
      default:
        return []
    }
  }, [transfersByType, type])

  const renderIcons = useMemo(() => {
    if (!txData) return null

    return txData.map((send, index) => {
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
      return (
        <AssetIcon
          showNetworkIcon={false}
          key={send.assetId}
          assetId={send.assetId}
          clipPath={overideClipPath ? overideClipPath : defaultClipPath}
          name={send.asset.name}
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
    if (type === '') {
      return (
        <AssetIcon size={size} icon={WebIcon} clipPath={defaultClipPath} color='text.subtlest' />
      )
    }
    return renderIcons
  }, [WebIcon, assetId, renderIcons, size, type])
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
