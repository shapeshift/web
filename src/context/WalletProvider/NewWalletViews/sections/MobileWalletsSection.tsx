import type { ButtonProps } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TbPlus } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { WalletListButton } from '@/context/WalletProvider/components/WalletListButton'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { MobileWalletList } from '@/pages/ConnectWallet/components/WalletList'

const PlusIcon = <TbPlus />

export type MobileWalletsSectionProps = {
  showHeader?: boolean
}

const buttonProps: ButtonProps = {
  variant: 'ghost',
  p: 2,
  height: 'auto',
  iconSpacing: 4,
}

export const MobileWalletsSection = ({ showHeader = true }: MobileWalletsSectionProps) => {
  const mobileWalletDialog = useModal('mobileWalletDialog')
  const translate = useTranslate()
  const { dispatch } = useWallet()

  const handleAddNewWalletClick = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    mobileWalletDialog.open({ defaultRoute: MobileWalletDialogRoutes.Start })
  }, [dispatch, mobileWalletDialog])

  return (
    <>
      {showHeader && (
        <Text
          fontSize='xl'
          fontWeight='semibold'
          translation='walletProvider.shapeShift.onboarding.shapeshiftNative'
        />
      )}
      <Stack spacing={2} my={showHeader ? 6 : 0}>
        <MobileWalletList buttonProps={buttonProps} avatarSize='lg' isScrollable={false} />

        <WalletListButton
          onSelect={handleAddNewWalletClick}
          isSelected={false}
          isDisabled={false}
          icon={PlusIcon}
          name={translate('walletProvider.shapeShift.onboarding.shapeshiftNative')}
        />
      </Stack>
    </>
  )
}
