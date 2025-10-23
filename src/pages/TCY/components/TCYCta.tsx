import { CloseIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertTitle,
  Button,
  IconButton,
  Skeleton,
  SkeletonCircle,
  Stack,
} from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { useTCYClaims } from '../queries/useTcyClaims'

import { AssetIcon } from '@/components/AssetIcon'
import { useLocalStorage } from '@/hooks/useLocalStorage/useLocalStorage'
import { selectIsPortfolioLoading } from '@/state/slices/selectors'

const margin = { base: 4, md: 0 }
const buttonMaxW = { base: '120px', md: 'none' }
const buttonPx = { base: 3, md: 4 }
const buttonPy = { base: 3, md: 2 }

const CtaSkeleton = () => {
  return (
    <Alert status='info' m={margin} width='auto'>
      <SkeletonCircle size='32px' />
      <Stack spacing={0} ml={4}>
        <Skeleton width='100px' height='24px' />
      </Stack>
      <Skeleton ml='auto' flexShrink={0} borderRadius='xl' width='100px' height='40px' />
    </Alert>
  )
}

const closeIcon = <CloseIcon />

export const TCYCta = () => {
  const navigate = useNavigate()
  const loading = useSelector(selectIsPortfolioLoading)
  const translate = useTranslate()
  const claimsQuery = useTCYClaims('all')
  const [isClosed, setIsClosed] = useLocalStorage<boolean>('TCY_CTA_CLOSED', false)
  const hasClaims = useMemo(() => claimsQuery.some(query => query.data.length), [claimsQuery])

  const handleClose = useCallback(() => {
    setIsClosed(true)
  }, [setIsClosed])

  const handleClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  if (loading) return <CtaSkeleton />

  if (isClosed) return null

  return (
    <Alert status='info' m={margin} width='auto'>
      <AssetIcon assetId={tcyAssetId} />
      <Stack spacing={0} ml={4}>
        <AlertTitle>{translate(hasClaims ? 'TCY.cta.hasClaimsTitle' : 'TCY.cta.title')}</AlertTitle>
      </Stack>
      <Button
        ml='auto'
        flexShrink={0}
        onClick={handleClick}
        whiteSpace='normal'
        height='auto'
        maxW={buttonMaxW}
        px={buttonPx}
        py={buttonPy}
      >
        {translate('TCY.cta.button')}
      </Button>
      <IconButton variant='ghost' icon={closeIcon} aria-label='Close' onClick={handleClose} />
    </Alert>
  )
}
