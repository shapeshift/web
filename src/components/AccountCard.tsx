import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, SkeletonCircle, SkeletonText, Tooltip } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { trimWithEndEllipsis } from 'lib/utils'

import { Amount } from './Amount/Amount'
import { AssetIcon } from './AssetIcon'
import { RawText } from './Text'

type AccountCardProps = {
  asset: Asset
  isLoaded?: boolean
  fiatAmountAvailable: string
  cryptoAmountAvailable: string
  showCrypto?: boolean
  onClick?: () => void
} & ButtonProps

const chevronRightIcon = <ChevronRightIcon boxSize={6} />
const maxLabelLength = 40

export const AccountCard = ({
  asset,
  isLoaded,
  fiatAmountAvailable,
  cryptoAmountAvailable,
  showCrypto,
  onClick,
  ...rest
}: AccountCardProps) => {
  const translate = useTranslate()
  const buttonLeftIcon = useMemo(
    () => (
      <SkeletonCircle isLoaded={isLoaded} boxSize='40px'>
        <AssetIcon assetId={asset.assetId} boxSize='40px' />
      </SkeletonCircle>
    ),
    [asset.assetId, isLoaded],
  )

  const willOverflow = useMemo(() => asset.name.length > maxLabelLength, [asset.name])

  return (
    <Button
      onClick={onClick}
      width='full'
      justifyContent='flex-start'
      py={4}
      height='auto'
      textAlign='left'
      leftIcon={buttonLeftIcon}
      rightIcon={chevronRightIcon}
      {...rest}
    >
      <SkeletonText noOfLines={2} isLoaded={isLoaded} mr='auto' width='full'>
        <Tooltip label={asset.name} isDisabled={!willOverflow}>
          <RawText lineHeight='1.5' data-test='account-card-asset-name-label' width='max-content'>
            {trimWithEndEllipsis(asset.name, maxLabelLength)}
          </RawText>
        </Tooltip>
        {showCrypto ? (
          <Amount.Crypto
            color='text.subtle'
            lineHeight='1'
            maximumFractionDigits={6}
            symbol={asset.symbol}
            value={cryptoAmountAvailable}
            suffix={translate('common.available')}
            data-test='account-card-crypto-label'
          />
        ) : (
          <Amount.Fiat
            value={fiatAmountAvailable}
            lineHeight='1'
            color='text.subtle'
            suffix={translate('common.available')}
            data-test='account-card-fiat-label'
          />
        )}
      </SkeletonText>
    </Button>
  )
}
