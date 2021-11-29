import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, ButtonProps } from '@chakra-ui/react'
import { SkeletonCircle, SkeletonText } from '@chakra-ui/skeleton'
import { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'

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
      isFullWidth
      justifyContent='flex-start'
      py={4}
      height='auto'
      textAlign='left'
      leftIcon={
        <SkeletonCircle isLoaded={isLoaded} boxSize='40px'>
          <AssetIcon src={asset.icon} boxSize='40px' />
        </SkeletonCircle>
      }
      rightIcon={<ChevronRightIcon boxSize={6} />}
      {...rest}
    >
      <SkeletonText noOfLines={2} isLoaded={isLoaded} mr='auto'>
        <RawText lineHeight='1' mb={1}>
          {asset.name}
        </RawText>

        {showCrypto ? (
          <Amount.Crypto
            color='gray.500'
            lineHeight='1'
            maximumFractionDigits={6}
            symbol={asset.symbol}
            value={cryptoAmountAvailable}
            suffix={translate('common.available')}
          />
        ) : (
          <Amount.Fiat
            value={fiatAmountAvailable}
            lineHeight='1'
            color='gray.500'
            suffix={translate('common.available')}
          />
        )}
      </SkeletonText>
    </Button>
  )
}
