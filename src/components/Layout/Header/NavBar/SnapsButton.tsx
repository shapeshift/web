import { Button } from '@chakra-ui/react'
import { enableShapeShiftSnap } from 'utils/snaps'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

export const SnapsButton = () => {
  const handleClick = () => {
    enableShapeShiftSnap()
  }

  const isSnapsEnabled = useFeatureFlag('Snaps')
  if (!isSnapsEnabled) return null
  return (
    <Button onClick={handleClick} colorScheme='blue'>
      Oh snap
    </Button>
  )
}
