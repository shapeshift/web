import { BoxProps, Button } from '@chakra-ui/react'
import { useMediaQuery } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import { keyframes } from '@chakra-ui/react'
import { Box, IconButton, Tooltip } from '@chakra-ui/react'
import { FaCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { breakpoints } from 'theme/theme'

type FiatRampsProps = BoxProps

export const FiatRamps = (props: FiatRampsProps) => {
  const { fiatRamps } = useModal()
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const handleWalletModalOpen = () =>
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })

  const bg = useColorModeValue(
    'linear-gradient(126deg, var(--chakra-colors-gray-100) 0%, var(--chakra-colors-gray-100) 40%, var(--chakra-colors-white) 50%, var(--chakra-colors-gray-100) 60%)',
    'linear-gradient(126deg, var(--chakra-colors-gray-700) 0%, var(--chakra-colors-gray-700) 40%, var(--chakra-colors-gray-500) 50%, var(--chakra-colors-gray-700) 60%)',
  )

  const rainbow = keyframes`
    0% {
      background-position: 10% 0;
    }
    2% {
      background-position: 10% 0;
    }
    
    10% {
      background-position: 91% 100%;
    }
    14% {
      background-position: 91% 100%;
    }
    100% {
      background-position: 91% 100%;
    }
  `

  return (
    <Box alignSelf='flex-end' {...props} mr={4}>
      <Tooltip label={translate('fiatRamps.headerLabel')} isDisabled={!isLargerThanMd}>
        <Button onClick={() => (isConnected ? fiatRamps.open({}) : handleWalletModalOpen())}>
          Buy Bitcoin
        </Button>
      </Tooltip>
    </Box>
  )
}
