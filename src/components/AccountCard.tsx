import { ChevronRightIcon } from '@chakra-ui/icons'
import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, SkeletonCircle, SkeletonText } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { motion } from 'framer-motion'
import type { RefCallback } from 'react'
import { useCallback, useMemo, useState } from 'react'
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
const labelInitialProps = { x: 0 }
const hoverProps = {
  x: 'var(--x-offset)',
  transition: { duration: 1, type: 'linear', ease: 'linear' },
}

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

  const [showEllipsis, setShowEllipsis] = useState(false)

  const getXOffset: RefCallback<HTMLDivElement> = useCallback(element => {
    if (element) {
      const parent = element.parentElement?.parentElement?.parentElement
      const prevSibling = parent?.previousElementSibling
      const nextSibling = parent?.nextElementSibling
      const widthAvailable =
        (parent?.parentElement?.clientWidth ?? 0) -
        (prevSibling?.clientWidth ?? 0) -
        (nextSibling?.clientWidth ?? 0) -
        32 // padding in the parent div
      const textWidth = element.firstElementChild?.clientWidth ?? 0
      const isOverflowing = textWidth > widthAvailable

      if (isOverflowing) {
        setShowEllipsis(true)
      }

      element.style.setProperty(
        '--x-offset',
        isOverflowing ? `-${textWidth - widthAvailable}px` : '0px',
      )

      element.style.setProperty('--x-target-width', `${widthAvailable}px`)
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
      <SkeletonText noOfLines={2} isLoaded={isLoaded} mr='auto' width='full'>
        {/* <Flex> */}
        <Box overflow='hidden' whiteSpace='nowrap' position='relative'>
          <Box
            as={motion.div}
            initial={labelInitialProps}
            whileTap={labelInitialProps}
            whileHover={hoverProps}
            width='var(--x-target-width)'
            onHoverStart={() => setShowEllipsis(false)}
            onHoverEnd={() => setShowEllipsis(true)}
            ref={getXOffset}
          >
            <RawText lineHeight='1.5' data-test='account-card-asset-name-label' width='max-content'>
              {showEllipsis ? trimWithEndEllipsis(asset.name, 40) : asset.name}
            </RawText>
          </Box>
        </Box>
        {/* {showEllipsis && <RawText lineHeight='1.5'>...</RawText>} */}
        {/* </Flex> */}

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
