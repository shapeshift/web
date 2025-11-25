import type { HeadingProps, StackProps, TextProps } from '@chakra-ui/react'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Center,
  Heading as CkHeading,
  Divider,
  Flex,
  Image,
  Link,
  Spinner,
  Stack,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, matchPath, useNavigate } from 'react-router-dom'

import { MobileWalletList } from './components/WalletList'

import BlueFox from '@/assets/blue-fox.svg'
import GreenFox from '@/assets/green-fox.svg'
import OrangeFox from '@/assets/orange-fox.svg'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { FadeTransition } from '@/components/FadeTransition'
import { LanguageSelector } from '@/components/LanguageSelector'
import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { SlideTransitionY } from '@/components/SlideTransitionY'
import { RawText, Text } from '@/components/Text'
import { listWallets } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useModal } from '@/hooks/useModal/useModal'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { useWallet } from '@/hooks/useWallet/useWallet'

const containerStyles = { touchAction: 'none' }

const scaleFade = keyframes`
  from { scale: 1.5; opacity: 0; }
  to { scale: 1; opacity: 1;}
`

const BodyStack: React.FC<StackProps> = props => (
  <Stack spacing={6} position='relative' zIndex='4' {...props} />
)

const Heading: React.FC<HeadingProps> = props => (
  <CkHeading fontSize='24px' letterSpacing='-0.684px' fontWeight='semibold' {...props} />
)

const BodyText: React.FC<TextProps> = props => (
  <RawText
    letterSpacing='-0.32px'
    color='text.subtle'
    fontWeight='medium'
    maxWidth='90%'
    mx='auto'
    {...props}
  />
)

export const MobileConnect = () => {
  const { dispatch, state } = useWallet()
  const translate = useTranslate()
  const [wallets, setWallets] = useState<RevocableWallet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hideWallets, setHideWallets] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const scaleFadeAnimation = `${scaleFade} 0.6s cubic-bezier(0.76, 0, 0.24, 1)`
  const hasWallet = Boolean(state.walletInfo?.deviceId)
  const navigate = useNavigate()

  const { open: openMobileWalletDialog, isOpen: isMobileWalletDialogOpen } =
    useModal('mobileWalletDialog')
  const [isWaitingForRedirection, setIsWaitingForRedirection] = useState<boolean>(false)

  const handleOpenCreateWallet = useCallback(() => {
    openMobileWalletDialog({ defaultRoute: MobileWalletDialogRoutes.Create })
  }, [openMobileWalletDialog])

  const handleImport = useCallback(() => {
    openMobileWalletDialog({ defaultRoute: MobileWalletDialogRoutes.Import })
  }, [openMobileWalletDialog])

  const query = useQuery<{ returnUrl: string }>()

  useEffect(() => {
    if (state.isLoadingLocalWallet) {
      setIsWaitingForRedirection(true)
    }

    if (!state.isLoadingLocalWallet && !hasWallet) {
      setIsWaitingForRedirection(false)
    }
  }, [state.isLoadingLocalWallet, hasWallet])

  useEffect(() => {
    // This handles reloading an asset's account page on Native/KeepKey. Without this, routing will break.
    // /:accountId/:assetId really is /:accountId/:chainId/:assetSubId e.g /accounts/eip155:1:0xmyPubKey/eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    // The (/:chainId/:assetSubId) part is URI encoded as one entity in the regular app flow in <AssetAccountRow />, using generatePath()
    // This applies a similar logic here, that works with navigate()
    const match = matchPath(
      {
        path: '/accounts/:accountId/:chainId/:assetSubId',
        end: false,
      },
      query.returnUrl,
    )
    const path = match
      ? generatePath('/accounts/:accountId/:assetId', {
          accountId: match?.params?.accountId ?? '',
          assetId: `${match?.params?.chainId ?? ''}/${match?.params?.assetSubId ?? ''}`,
        })
      : query?.returnUrl
    if (hasWallet) {
      navigate(path ?? TradeRoutePaths.Input)
      setIsWaitingForRedirection(false)
    }
  }, [navigate, hasWallet, query, state, dispatch, setIsWaitingForRedirection])

  useEffect(() => {
    if (!wallets.length) {
      setIsLoading(true) // Set loading state to true when fetching wallets
      ;(async () => {
        try {
          const vaults = await listWallets()
          if (!vaults.length) {
            setError('walletProvider.shapeShift.load.error.noWallet')
          } else {
            setWallets(vaults)
          }
        } catch (e) {
          console.log(e)
          setError('An error occurred while fetching wallets.')
        } finally {
          setIsLoading(false) // Set loading state to false when fetching is done
        }
      })()
    }
  }, [wallets])

  const handleToggleWallets = useCallback(() => {
    setHideWallets(!hideWallets) // allow users with saved wallets to toggle between saved and create/import
  }, [hideWallets])

  useEffect(() => {
    if (!wallets.length && !isLoading) {
      setHideWallets(true) // If they have no wallets, show the default create or import
    }
  }, [isLoading, wallets.length])

  useEffect(() => {
    if (!isMobileWalletDialogOpen) {
      setHideWallets(false)
    }
  }, [isMobileWalletDialogOpen])

  const handleIsWaitingForRedirection = useCallback((isWaitingForRedirection: boolean) => {
    setIsWaitingForRedirection(isWaitingForRedirection)
  }, [])

  const content = useMemo(() => {
    return hideWallets ? (
      <motion.div
        key='new-wallet'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 0.3 } }}
      >
        <BodyStack>
          <Stack textAlign='center' spacing={2}>
            <Heading>{translate('connectWalletPage.welcomeToShapeShift')}</Heading>
            <BodyText>{translate('connectWalletPage.mobileWelcomeBody')}</BodyText>
          </Stack>
          <Stack maxWidth='80%' mx='auto' spacing={4} width='full'>
            <Button colorScheme='blue' size='lg-multiline' onClick={handleOpenCreateWallet}>
              {translate('connectWalletPage.createANewWallet')}
            </Button>
            <Button variant='outline' size='lg-multiline' onClick={handleImport}>
              {translate('connectWalletPage.importExisting')}
            </Button>

            {!!wallets.length && (
              <>
                <Flex gap={2} alignItems='center'>
                  <Divider borderColor='border.base' />
                  <RawText>{translate('common.or')}</RawText>
                  <Divider borderColor='border.base' />
                </Flex>
                <Button variant='outline' size='lg-multiline' onClick={handleToggleWallets}>
                  {translate('connectWalletPage.viewSavedWallets')}
                </Button>
              </>
            )}
          </Stack>
        </BodyStack>
      </motion.div>
    ) : (
      <motion.div
        key='wallet-list'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 0.3 } }}
      >
        <BodyStack>
          <Stack textAlign='center' spacing={2}>
            <Heading>{translate('connectWalletPage.welcomeBack')}</Heading>
            {!isWaitingForRedirection && !state.isLoadingLocalWallet ? (
              <BodyText>{translate('connectWalletPage.mobileSelectBody')}</BodyText>
            ) : null}
          </Stack>
          <Stack>
            {isWaitingForRedirection || state.isLoadingLocalWallet ? (
              <Center py={6}>
                <Spinner />
              </Center>
            ) : (
              <>
                <MobileWalletList onIsWaitingForRedirection={handleIsWaitingForRedirection} />
                <Button size='lg-multiline' variant='outline' onClick={handleToggleWallets}>
                  {translate('connectWalletPage.createOrImport')}
                </Button>
              </>
            )}
            {error && (
              <Alert status='error'>
                <AlertIcon />
                <AlertDescription>
                  <Text translation={error} />
                </AlertDescription>
              </Alert>
            )}
          </Stack>
        </BodyStack>
      </motion.div>
    )
  }, [
    error,
    handleImport,
    handleOpenCreateWallet,
    handleToggleWallets,
    hideWallets,
    translate,
    wallets,
    isWaitingForRedirection,
    handleIsWaitingForRedirection,
    state.isLoadingLocalWallet,
  ])

  return (
    <Flex
      gap={6}
      bg='radial-gradient(228.95% 64.62% at 50% 5.25%, rgba(55, 97, 249, 0.40) 0%, rgba(0, 0, 0, 0.00) 100%), #101010'
      flexDir='column'
      height='100dvh'
      justifyContent='flex-end'
      pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom))'
      overflow='hidden'
      style={containerStyles}
    >
      <Flex flex={1} position='absolute' width='100%' height='55%' top={0} left={0}>
        <Image
          src={GreenFox}
          position='absolute'
          left={0}
          bottom={0}
          width='auto'
          height='63%'
          animation={scaleFadeAnimation}
        />
        <Image
          src={BlueFox}
          position='absolute'
          top={0}
          right={0}
          width='auto'
          height='120%'
          animation={scaleFadeAnimation}
        />
        <Image
          src={OrangeFox}
          position='absolute'
          top={0}
          left={0}
          width='auto'
          height='65%'
          animation={scaleFadeAnimation}
        />
      </Flex>
      <AnimatePresence mode='wait'>
        {isLoading ? (
          <FadeTransition key='loading'>
            <Center height='100vh'>
              <CircularProgress />
            </Center>
          </FadeTransition>
        ) : (
          <>
            <Stack
              position='absolute'
              top='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
              right={6}
            >
              <LanguageSelector size='sm' />
            </Stack>
            <SlideTransitionY key='content'>
              <Stack px={6} spacing={6} position='relative' zIndex='4' pb={4}>
                <AnimatePresence mode='wait' initial={false}>
                  <motion.div
                    layout
                    transition={{ layout: { type: 'spring', bounce: 0.4, duration: 0.5 } }}
                  >
                    {content}
                  </motion.div>
                </AnimatePresence>

                <RawText
                  fontSize='sm'
                  color='text.subtle'
                  textAlign='center'
                  maxWidth='80%'
                  mx='auto'
                >
                  {translate('connectWalletPage.footerOne')}{' '}
                  <Link
                    isExternal
                    target='_blank'
                    fontWeight='bold'
                    href='https://app.shapeshift.com/#/legal/terms-of-service'
                  >
                    {translate('connectWalletPage.terms')}
                  </Link>{' '}
                  {translate('common.and')}{' '}
                  <Link
                    isExternal
                    target='_blank'
                    fontWeight='bold'
                    href='https://app.shapeshift.com/#/legal/privacy-policy'
                  >
                    {translate('connectWalletPage.privacyPolicy')}
                  </Link>
                </RawText>
              </Stack>
            </SlideTransitionY>
          </>
        )}
      </AnimatePresence>
    </Flex>
  )
}
