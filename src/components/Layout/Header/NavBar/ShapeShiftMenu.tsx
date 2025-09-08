import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Grid,
  HStack,
  Icon,
  Link,
  Menu,
  MenuButton,
  MenuList,
  Text,
  useDisclosure,
  useMediaQuery,
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaDiscord, FaGithub } from 'react-icons/fa'
import { FiSmartphone } from 'react-icons/fi'
import { RiTwitterXLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { Link as RouterLink } from 'react-router-dom'

import { FoxIcon } from '@/components/Icons/FoxIcon'
import { OGIcon } from '@/components/Icons/OGIcon'
import { ShapeShiftLogoText } from '@/components/Icons/ShapeShiftLogoText'
import { WalletIcon } from '@/components/Icons/WalletIcon'
import { breakpoints } from '@/theme/theme'

const productItemHoverSx = { bg: 'whiteAlpha.100' }
const footerLinkHoverSx = { color: 'white' }
const socialIconHoverSx = { color: 'white', bg: 'whiteAlpha.100' }

const ProductItem = ({
  icon,
  title,
  subtitle,
  href,
  isExternal = false,
}: {
  icon: React.ComponentType
  title: string
  subtitle: string
  href: string
  isExternal?: boolean
}) => {
  const linkProps = isExternal
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { as: RouterLink, to: href }

  return (
    <Link {...linkProps} p={3} borderRadius='lg' _hover={productItemHoverSx} textDecoration='none'>
      <HStack spacing={3} align='center'>
        <Box
          p={2}
          borderRadius='md'
          bg='whiteAlpha.100'
          color='blue.400'
          display='flex'
          alignItems='center'
          justifyContent='center'
          flexShrink={0}
        >
          <Icon as={icon} boxSize={5} />
        </Box>
        <VStack align='flex-start' spacing={1}>
          <Text fontWeight='semibold' color='white' fontSize='sm'>
            {title}
          </Text>
          <Text fontSize='xs' color='whiteAlpha.700'>
            {subtitle}
          </Text>
        </VStack>
      </HStack>
    </Link>
  )
}

const FooterLink = ({
  href,
  children,
  isExternal = false,
}: {
  href: string
  children: React.ReactNode
  isExternal?: boolean
}) => {
  const linkProps = isExternal
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { as: RouterLink, to: href }

  return (
    <Link {...linkProps} fontSize='sm' color='whiteAlpha.700' _hover={footerLinkHoverSx}>
      {children}
    </Link>
  )
}

const SocialIcon = ({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ComponentType
  label: string
}) => {
  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      p={1}
      borderRadius='md'
      color='whiteAlpha.600'
      _hover={socialIconHoverSx}
      aria-label={label}
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      <Icon as={icon} boxSize={4} />
    </Link>
  )
}

export const ShapeShiftMenu = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const translate = useTranslate()
  const [isLargerThanXl] = useMediaQuery(`(min-width: ${breakpoints['xl']})`)

  const afterSx = useMemo(
    () => ({
      content: '""',
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      height: '10px',
      display: isOpen ? 'block' : 'none',
    }),
    [isOpen],
  )

  return (
    <Box onMouseEnter={onOpen} onMouseLeave={onClose} position='relative' _after={afterSx}>
      <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
        <MenuButton
          as={HStack}
          spacing={2}
          cursor='pointer'
          flexShrink={0}
          whiteSpace='nowrap'
          alignItems='center'
        >
          {isLargerThanXl ? (
            <ShapeShiftLogoText height='6' width='auto' flexShrink={0} />
          ) : (
            <FoxIcon boxSize='5' flexShrink={0} />
          )}
          <Icon as={ChevronDownIcon} boxSize={4} color='whiteAlpha.600' flexShrink={0} />
        </MenuButton>

        <MenuList
          bg='whiteAlpha.100'
          backdropFilter='blur(20px)'
          border='1px solid'
          borderColor='whiteAlpha.200'
          boxShadow='xl'
          borderRadius='lg'
          p={6}
          minW='500px'
          mt={0}
        >
          <VStack align='stretch' spacing={6}>
            <Box>
              <Text fontSize='sm' fontWeight='semibold' color='whiteAlpha.600' mb={3}>
                {translate('shapeShiftMenu.products')}
              </Text>
              <Grid templateColumns='1fr 1fr' gap={2}>
                <ProductItem
                  icon={FiSmartphone}
                  title={translate('shapeShiftMenu.mobileApp.title')}
                  subtitle={translate('shapeShiftMenu.mobileApp.subtitle')}
                  href='https://shapeshift.com/mobile-app'
                  isExternal
                />
                <ProductItem
                  icon={FoxIcon}
                  title={translate('shapeShiftMenu.foxToken.title')}
                  subtitle={translate('shapeShiftMenu.foxToken.subtitle')}
                  href='/fox-ecosystem'
                />
                <ProductItem
                  icon={OGIcon}
                  title={translate('shapeShiftMenu.classic.title')}
                  subtitle={translate('shapeShiftMenu.classic.subtitle')}
                  href='https://og.shapeshift.com/'
                  isExternal
                />
                <ProductItem
                  icon={WalletIcon}
                  title={translate('shapeShiftMenu.wallet.title')}
                  subtitle={translate('shapeShiftMenu.wallet.subtitle')}
                  href='https://shapeshift.com/defi-wallet'
                  isExternal
                />
              </Grid>
            </Box>

            <Flex
              justify='space-between'
              align='center'
              pt={4}
              borderTop='1px solid'
              borderColor='whiteAlpha.200'
            >
              <HStack spacing={6} align='baseline'>
                <FooterLink href='https://snapshot.org/#/shapeshiftdao.eth' isExternal>
                  {translate('shapeShiftMenu.footer.governance')}
                </FooterLink>
                <FooterLink href='https://shapeshift.notion.site/' isExternal>
                  {translate('shapeShiftMenu.footer.documentation')}
                </FooterLink>
                <FooterLink href='https://shapeshift.com/blog' isExternal>
                  {translate('shapeShiftMenu.footer.blog')}
                </FooterLink>
                <FooterLink href='https://shapeshift.com/faq' isExternal>
                  {translate('shapeShiftMenu.footer.faq')}
                </FooterLink>
              </HStack>

              <HStack spacing={1} align='baseline'>
                <SocialIcon
                  href='https://github.com/shapeshift/web'
                  icon={FaGithub}
                  label={translate('shapeShiftMenu.footer.github')}
                />
                <SocialIcon
                  href='https://discord.gg/shapeshift'
                  icon={FaDiscord}
                  label={translate('shapeShiftMenu.footer.discord')}
                />
                <SocialIcon
                  href='https://x.com/shapeshift'
                  icon={RiTwitterXLine}
                  label={translate('shapeShiftMenu.footer.twitter')}
                />
              </HStack>
            </Flex>
          </VStack>
        </MenuList>
      </Menu>
    </Box>
  )
}
