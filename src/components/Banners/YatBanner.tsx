import type { LinkProps } from '@chakra-ui/react'
import { Flex, Link, Tooltip, useMediaQuery } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { YatIcon } from 'components/Icons/YatIcon'
import { Text } from 'components/Text'
import { breakpoints } from 'theme/theme'

type YatBannerProps = {
  isCompact?: boolean
} & LinkProps

export const YatBanner: React.FC<YatBannerProps> = ({ isCompact, ...rest }) => {
  const [isLargerThan2xl] = useMediaQuery(`(min-width: ${breakpoints['2xl']})`, { ssr: false })
  const translate = useTranslate()

  const isBig = isLargerThan2xl || !isCompact

  return (
    <Tooltip label={translate('features.yat.banner.title')} isDisabled={isBig} placement='right'>
      <Link
        href='https://y.at'
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
