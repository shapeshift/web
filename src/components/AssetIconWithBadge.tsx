import type { AvatarProps } from '@chakra-ui/react'
import { Box, Center, Image } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { TransferType } from '@shapeshiftoss/unchained-client'
import uniqBy from 'lodash/uniqBy'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { LuGlobe } from 'react-icons/lu'

import {
  AssetIcon,
  bottomClipPath,
  defaultClipPath,
  squareClipPath,
  topClipPath,
} from './AssetIcon'

import FlipShadow from '@/assets/flip-shadow.svg?url'
import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const pairIconsBadgeClipPath =
  'polygon(83% 0%, 100% 0%, 100% 100%, 0% 112%, 0% 105%, 16% 100%, -8% 56%, 3% 33%, 2% 36%, 5% 37%, 6% 36%, 8% 37%, 11% 45%, 11% 34%, 17% 38%, 18% 37%, 31% 33%, 34% 17%, 34% 0%, 23% 0%, 26% 0%, 29% 0%, 32% 0%, 35% 0%, 37% 0%, 39% 0%, 40% 0%, 41% 0%, 42% 0%, 43% 0%, 43% 0%)'

type AssetIconWithBadgeProps = {
  size?: AvatarProps['size']
  assetId?: AssetId
  secondaryAssetId?: AssetId
  transfersByType?: Record<TransferType, Transfer[]>
  type?: string
} & PropsWithChildren

const sxProps = { svg: { transform: 'scale(0.8)' } }

const useTransferData = (transfersByType?: Record<TransferType, Transfer[]>) => {
  const transfers = useMemo(
    () => (transfersByType ? uniqBy(Object.values(transfersByType).flat(), 'assetId') : []),
    [transfersByType],
  )

  const isNft = useMemo(
    () =>
      Boolean(
        transfersByType &&
          Object.values(transfersByType)
            .flat()
            .some(transfer => !!transfer.id),
      ),
    [transfersByType],
  )

  return { transfers, isNft }
}

const getClipPath = (
  index: number,
  totalTransfers: number,
  isNft: boolean,
  asset: Asset | undefined,
) => {
  if (isNft) return squareClipPath
  if (totalTransfers === 1) {
    if (asset?.icons && asset.icons.length > 1) return pairIconsBadgeClipPath

    return defaultClipPath
  }
  if (index === 1) return bottomClipPath
  return topClipPath
}

const TransferIcon: React.FC<{
  transfer: Transfer
  index: number
  totalTransfers: number
  isNft: boolean
  size?: AvatarProps['size']
}> = ({ transfer, index, totalTransfers, isNft, size }) => {
  const isSecondTransfer = index === 1
  const shouldShowShadow = isSecondTransfer && totalTransfers > 1
  const asset = useAppSelector(state => selectAssetById(state, transfer.assetId))

  if (totalTransfers > 2 && index === 2) return null // Skip third+ transfers

  return (
    <Box>
      {shouldShowShadow && (
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
        assetId={transfer.assetId}
        clipPath={getClipPath(index, totalTransfers, isNft, asset)}
        name={transfer.asset.symbol}
        size={size}
        position={shouldShowShadow ? 'absolute' : 'static'}
        borderRadius={isNft ? 0 : 'full'}
        left={0}
        top={0}
      />
    </Box>
  )
}

export const AssetIconWithBadge: React.FC<AssetIconWithBadgeProps> = ({
  size,
  assetId,
  secondaryAssetId,
  transfersByType,
  type,
  children,
}) => {
  const { transfers, isNft } = useTransferData(transfersByType)
  const webIcon = <LuGlobe />
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const renderContent = () => {
    if (assetId && secondaryAssetId) {
      return (
        <>
          <Box>
            <Image
              src={FlipShadow}
              position='absolute'
              width='100%'
              height='100%'
              left={0}
              top={0}
              zIndex={2}
            />
            <AssetIcon
              showNetworkIcon={false}
              assetId={assetId}
              clipPath={bottomClipPath}
              size={size}
              position='absolute'
              left={0}
              top={0}
            />
          </Box>
          <AssetIcon
            showNetworkIcon={false}
            assetId={secondaryAssetId}
            clipPath={topClipPath}
            size={size}
          />
        </>
      )
    }

    if (assetId) {
      return (
        <AssetIcon
          showNetworkIcon={false}
          assetId={assetId}
          clipPath={
            asset?.icons && asset.icons.length > 1 ? pairIconsBadgeClipPath : defaultClipPath
          }
          size={size}
        />
      )
    }

    if (type === '' && transfers.length === 0) {
      return (
        <AssetIcon size={size} icon={webIcon} clipPath={defaultClipPath} color='text.subtlest' />
      )
    }

    return transfers.map((transfer, index) => (
      <TransferIcon
        key={transfer.assetId}
        transfer={transfer}
        index={index}
        totalTransfers={transfers.length}
        isNft={isNft}
        size={size}
      />
    ))
  }

  return (
    <Center position='relative'>
      <Center position='absolute' left='-8%' top='-8%' boxSize='40%' sx={sxProps} color='white'>
        {children}
      </Center>
      {renderContent()}
    </Center>
  )
}
