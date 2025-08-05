export function pulseAndroid() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50) // 50ms vibration
  }
}
