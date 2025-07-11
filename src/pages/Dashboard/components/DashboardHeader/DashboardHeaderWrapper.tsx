import type { BoxProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'

import { useProfileAvatar } from '@/hooks/useProfileAvatar/useProfileAvatar'

type DashboardHeaderWrapperProps = {
  position?: BoxProps['position']
} & PropsWithChildren
export const DashboardHeaderWrapper: React.FC<DashboardHeaderWrapperProps> = ({
  children,
  position,
}) => {
  const avatarImage = useProfileAvatar()
  const headerAfter = useMemo(() => {
    return {
      content: '""',
      bgImage: avatarImage,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      position: 'absolute',
      left: 0,
      right: 0,
      height: '40%',
      top: 0,
      zIndex: -1,
    }
  }, [avatarImage])
  return (
    <Box
      width='full'
      className='dashboard-header'
      position={position ?? 'relative'}
      top='0'
      zIndex='sticky'
      _after={headerAfter}
    >
      <Box bg='background.surface.alpha' backdropFilter='blur(30px)'>
        {children}
      </Box>
    </Box>
  )
}
