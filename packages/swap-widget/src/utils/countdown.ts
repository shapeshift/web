export const formatCountdown = (msRemaining: number): string => {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = seconds.toString().padStart(2, '0')

  if (hours === 0) return `${minutes}:${paddedSeconds}`

  return `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}`
}
