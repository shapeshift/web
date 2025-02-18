import { Box, FormControl, Icon, Input, Text as CText } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { useCallback, useState } from 'react'
import { FaFile } from 'react-icons/fa'
import { Text } from 'components/Text'

const hoverSx = { borderColor: 'blue.500' }

// TODO(gomes): use https://www.chakra-ui.com/docs/components/file-upload if/when we migrate to chakra@3
export const FileUpload = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const [isDragging, setIsDragging] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const processFile = useCallback(
    (file: File) => {
      setFilename(file.name)
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files?.[0]) {
        processFile(files[0])
      }
    },
    [processFile],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files?.[0]) {
        processFile(files[0])
      }
    },
    [processFile],
  )

  return (
    <FormControl>
      <Input type='file' accept='.txt' onChange={handleFileInput} id='file-upload' display='none' />
      <Box
        as='label'
        htmlFor='file-upload'
        w='full'
        h='32'
        border='2px'
        borderStyle='dashed'
        borderColor={isDragging ? 'blue.500' : borderColor}
        borderRadius='xl'
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        bg='background.surface.raised.base'
        cursor='pointer'
        transition='all 0.2s'
        _hover={hoverSx}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Icon as={FaFile} boxSize={6} color='gray.500' mb={2} />
        {filename ? (
          <CText color='gray.500'>{filename}</CText>
        ) : (
          <Text color='gray.500' translation='walletProvider.shapeShift.import.dragAndDrop' />
        )}
      </Box>
    </FormControl>
  )
}
