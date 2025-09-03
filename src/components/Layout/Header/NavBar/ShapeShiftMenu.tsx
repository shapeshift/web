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
  VStack,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaDiscord, FaGithub } from 'react-icons/fa'
import { FiSmartphone } from 'react-icons/fi'
import { RiTwitterXLine } from 'react-icons/ri'
import { TbBrowser, TbCoin, TbWallet } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink } from 'react-router-dom'

import { ShapeShiftLogoText } from '@/components/Icons/ShapeShiftLogoText'

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
  const hoverStyle = useMemo(() => ({ bg: 'whiteAlpha.100' }), [])

  return (
    <Link
      as={isExternal ? 'a' : ReactRouterLink}
      to={isExternal ? undefined : href}
      href={isExternal ? href : undefined}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      p={3}
      borderRadius='lg'
      _hover={hoverStyle}
      textDecoration='none'
    >
      <HStack spacing={3} align='flex-start'>
        <Box p={2} borderRadius='md' bg='whiteAlpha.100' color='blue.400'>
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
  const hoverStyle = useMemo(() => ({ color: 'white' }), [])

  return (
    <Link
      as={isExternal ? 'a' : ReactRouterLink}
      to={isExternal ? undefined : href}
      href={isExternal ? href : undefined}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      fontSize='sm'
      color='whiteAlpha.700'
      _hover={hoverStyle}
    >
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
  const hoverStyle = useMemo(() => ({ color: 'white', bg: 'whiteAlpha.100' }), [])

  return (
    <Link
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      p={2}
      borderRadius='md'
      color='whiteAlpha.600'
      _hover={hoverStyle}
      aria-label={label}
    >
      <Icon as={icon} boxSize={5} />
    </Link>
  )
}

export const ShapeShiftMenu = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const translate = useTranslate()

  return (
    <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton
        as={HStack}
        spacing={2}
        cursor='pointer'
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        <ShapeShiftLogoText boxSize='7' width='auto' />
        <Icon as={ChevronDownIcon} boxSize={4} color='whiteAlpha.600' />
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
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        <VStack align='stretch' spacing={6}>
          {/* Products Grid */}
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
                icon={TbCoin}
                title={translate('shapeShiftMenu.foxToken.title')}
                subtitle={translate('shapeShiftMenu.foxToken.subtitle')}
                href='/fox-ecosystem'
              />
              <ProductItem
                icon={TbBrowser}
                title={translate('shapeShiftMenu.classic.title')}
                subtitle={translate('shapeShiftMenu.classic.subtitle')}
                href='https://og.shapeshift.com/'
                isExternal
              />
              <ProductItem
                icon={TbWallet}
                title={translate('shapeShiftMenu.wallet.title')}
                subtitle={translate('shapeShiftMenu.wallet.subtitle')}
                href='https://shapeshift.com/defi-wallet'
                isExternal
              />
            </Grid>
          </Box>

          {/* Footer */}
          <Flex
            justify='space-between'
            align='center'
            pt={4}
            borderTop='1px solid'
            borderColor='whiteAlpha.200'
          >
            <HStack spacing={6}>
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

            <HStack spacing={1}>
              <SocialIcon href='https://github.com/shapeshift/web' icon={FaGithub} label={translate('shapeShiftMenu.footer.github')} />
              <SocialIcon href='https://discord.gg/shapeshift' icon={FaDiscord} label={translate('shapeShiftMenu.footer.discord')} />
              <SocialIcon href='https://x.com/shapeshift' icon={RiTwitterXLine} label={translate('shapeShiftMenu.footer.twitter')} />
            </HStack>
          </Flex>
        </VStack>
      </MenuList>
    </Menu>
  )
}
