import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Button, SkeletonCircle, SkeletonText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import type { Asset } from 'lib/asset-service'

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
  return (
    <Button
      onClick={onClick}
      width='full'
      justifyContent='flex-start'
      py={4}
      height='auto'
      textAlign='left'
      leftIcon={
        <SkeletonCircle isLoaded={isLoaded} boxSize='40px'>
          <AssetIcon assetId={asset.assetId} boxSize='40px' />
        </SkeletonCircle>
      }
      rightIcon={<ChevronRightIcon boxSize={6} />}
      {...rest}
    >
      <SkeletonText noOfLines={2} isLoaded={isLoaded} mr='auto'>
        <RawText lineHeight='1' mb={1} data-test='account-card-asset-name-label'>
          {asset.name}
        </RawText>

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
