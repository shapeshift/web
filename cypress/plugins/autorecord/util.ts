export const blobToPlain = (blob: Blob) => {
  const uri = URL.createObjectURL(blob)
  const xhr = new XMLHttpRequest()

  xhr.open('GET', uri, false)
  xhr.send()

  URL.revokeObjectURL(uri)

  return blob.type === 'application/json' ? JSON.parse(xhr.response) : xhr.response
}
