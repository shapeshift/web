import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  CloseButton,
  Link,
  ToastId,
  useToast,
} from '@chakra-ui/react'
import { MutableRefObject } from 'react'
import { RiFlashlightLine } from 'react-icons/ri'

type InfoToastProps = {
  title: string
  description: () => JSX.Element
  cta: string
  toastRef: MutableRefObject<ToastId | undefined>
}

export const InfoToast = ({ toastRef, title, description, cta }: InfoToastProps) => {
  const toast = useToast()

  return (
    <Alert status='info' variant='solid' colorScheme='blue'>
      <Box alignSelf='flex-start' me={2}>
        <RiFlashlightLine size={24} />
      </Box>
      <Box>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description()}</AlertDescription>
        <Link
          href={'https://beta.shapeshift.com/updater-download'}
          display={'block'}
          fontWeight={'bold'}
          mt={2}
          isExternal
        >
          {cta}
        </Link>
      </Box>
      <CloseButton
        alignSelf='flex-start'
        position='relative'
        right={-1}
        top={-1}
        onClick={() => {
          if (toastRef.current) {
            toast.close(toastRef.current)
          }
        }}
      />
    </Alert>
  )
}
