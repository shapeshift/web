import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, IconButton } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { SkipConfirmModal } from '@/context/WalletProvider/components/SkipConfirmModal'

const arrowBackIcon = <ArrowBackIcon />

export const BackupPassphraseSkip = () => {
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleConfirm = useCallback(() => {
    navigate(BackupPassphraseRoutes.Success)
  }, [navigate])

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <Box>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleBack}
      />
      <SkipConfirmModal onConfirm={handleConfirm} onBack={handleBack} />
    </Box>
  )
}
