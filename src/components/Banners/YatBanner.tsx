import type { LinkProps } from '@chakra-ui/react'
import { Flex, Link, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { YatIcon } from 'components/Icons/YatIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

type YatBannerProps = {
  isCompact?: boolean
} & LinkProps

export const YatBanner: React.FC<YatBannerProps> = ({ isCompact, ...rest }) => {
  const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`, { ssr: false })
  const translate = useTranslate()
  const { isDemoWallet } = useWallet().state

  // we don't have UI/UX for switching accounts when clicking the yat banner
  // account 0 is gonna have to cut it
  const firstEvmAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, ethChainId),
  )

  const firstEvmAddress = useMemo(() => {
    if (!firstEvmAccountId) return undefined
    const { account } = fromAccountId(firstEvmAccountId)
    return account
  }, [firstEvmAccountId])

  // spec https://github.com/shapeshift/web/issues/4604
  const href = useMemo(() => {
    const baseUrl = 'https://www.y03btrk.com/DFBHL/7XDN2/'
    // don't track y.at purchases for demo wallet
    if (isDemoWallet) return baseUrl
    if (!firstEvmAddress) return baseUrl
    const params = new URLSearchParams()
    params.set('sub1', `0x1004=${firstEvmAddress}`)
    const baseUrlWithAddress = `${baseUrl}?${params.toString()}`
    return baseUrlWithAddress
  }, [firstEvmAddress, isDemoWallet])

  const isBig = isLargerThan2xl || !isCompact

  return (
    <Tooltip label={translate('features.yat.banner.title')} isDisabled={isBig} placement='right'>
      <Link
        href={href}
        isExternal
        display='block'
        aria-label={translate('features.yat.banner.title')}
        _hover={{ boxShadow: '0 0 0 2px var(--chakra-colors-chakra-body-text) inset' }}
        borderRadius='xl'
        backgroundImage={
          'radial-gradient(circle at bottom left, #00C1C165 0%, transparent 30%), radial-gradient(circle at top right, #7B61FF70 0%, transparent 50%)'
        }
        {...rest}
      >
        <Flex
          w='100%'
          position='relative'
          p={4}
          gap={4}
          overflow='hidden'
          borderRadius='lg'
          justifyContent='center'
        >
          <YatIcon boxSize='6' />
          {isBig && (
            <Flex flexDir='column' gap='1'>
              <Text fontWeight='bold' translation='features.yat.banner.title' />
              <Text
                translation='features.yat.banner.description'
                fontSize='xs'
                fontWeight='medium'
              />
            </Flex>
          )}
        </Flex>
      </Link>
    </Tooltip>
  )
}
