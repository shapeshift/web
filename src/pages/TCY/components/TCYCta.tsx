import { Alert, AlertTitle, Button, Skeleton, SkeletonCircle, Stack } from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { Suspense, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { useTCYClaims } from '../queries/useTcyClaims'

import { AssetIcon } from '@/components/AssetIcon'

const margin = { base: 4, md: 0 }

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

const suspenseFallback = <CtaSkeleton />

export const TCYCtaContent = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const claimsQuery = useTCYClaims('all')
  const hasClaims = useMemo(() => claimsQuery.some(query => query.data.length), [claimsQuery])

  const handleClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  return (
    <Suspense fallback={suspenseFallback}>
      <Alert status='info' m={margin} width='auto'>
        <AssetIcon assetId={tcyAssetId} />
        <Stack spacing={0} ml={4}>
          <AlertTitle>
            {translate(hasClaims ? 'TCY.cta.hasClaimsTitle' : 'TCY.cta.title')}
          </AlertTitle>
        </Stack>
        <Button ml='auto' flexShrink={0} onClick={handleClick}>
          {translate('TCY.cta.button')}
        </Button>
      </Alert>
    </Suspense>
  )
}

export const TCYCta = () => {
  return (
    <Suspense fallback={suspenseFallback}>
      <TCYCtaContent />
    </Suspense>
  )
}
