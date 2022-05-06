export const blobToPlain = (blob: Blob) => {
  let uri = URL.createObjectURL(blob)
  let xhr = new XMLHttpRequest()

  xhr.open('GET', uri, false)
  xhr.send()

  URL.revokeObjectURL(uri)

  return blob.type === 'application/json' ? JSON.parse(xhr.response) : xhr.response
}
