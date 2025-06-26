import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, IconButton } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { WordsErrorModal } from '@/context/WalletProvider/components/WordsErrorModal'

const arrowBackIcon = <ArrowBackIcon />

export const BackupPassphraseWordsError = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleReviewPhrase = useCallback(() => {
    navigate(BackupPassphraseRoutes.Info)
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
      <WordsErrorModal onRetry={handleBack} onReviewPhrase={handleReviewPhrase} />
    </Box>
  )
}
