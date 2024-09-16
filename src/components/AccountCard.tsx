import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, SkeletonCircle, SkeletonText, Tooltip } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
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

const leftIconBoxSize = '40px'
const rightIconBoxSize = 6
const chevronRightIcon = <ChevronRightIcon boxSize={rightIconBoxSize} />

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
      <SkeletonCircle isLoaded={isLoaded} boxSize={leftIconBoxSize}>
        <AssetIcon assetId={asset.assetId} boxSize={leftIconBoxSize} />
      </SkeletonCircle>
    ),
    [asset.assetId, isLoaded],
  )

  const [willOverflow, setWillOverflow] = useState(false)

  const checkOverflow = useCallback((el: HTMLElement | null) => {
    if (el) {
      const isOverflowing = el.scrollWidth > el.clientWidth
      setWillOverflow(isOverflowing)
    }
  }, [])

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
      <SkeletonText
        noOfLines={2}
        isLoaded={isLoaded}
        mr='auto'
        flexGrow={1}
        width={`calc(100% - ${leftIconBoxSize} - var(--chakra-sizes-${rightIconBoxSize}))`}
      >
        <Tooltip label={asset.name} isDisabled={!willOverflow}>
          <Box overflow='hidden'>
            <RawText
              lineHeight='1'
              mb={1}
              data-test='account-card-asset-name-label'
              overflow='hidden'
              textOverflow='ellipsis'
              whiteSpace='nowrap'
              ref={checkOverflow}
            >
              {asset.name}
            </RawText>
          </Box>
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
