export const gridOverlaySx = {
  content: '""',
  position: 'fixed' as const,
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundImage:
    'linear-gradient(to right, rgba(255, 255, 255, 0.01) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.01) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
  maskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
  zIndex: 1,
  pointerEvents: 'none' as const,
}

export const blurBackgroundSx = {
  content: '""',
  position: 'fixed' as const,
  bottom: '0',
  left: '0',
  right: '0',
  height: '40vh',
  background:
    'radial-gradient(ellipse 150% 80% at 50% 100%, rgba(55, 97, 249, 1) 0%, rgba(55, 97, 249, 0.9) 20%, rgba(55, 97, 249, 0.4) 50%, rgba(55, 97, 249, 0) 80%), radial-gradient(ellipse 120% 70% at 20% 100%, rgba(165, 55, 249, 1) 0%, rgba(165, 55, 249, 0.8) 20%, rgba(165, 55, 249, 0.3) 50%, rgba(165, 55, 249, 0) 80%), radial-gradient(ellipse 100% 60% at 80% 100%, rgba(22, 209, 161, 0.6) 0%, rgba(22, 209, 161, 0.2) 40%, rgba(22, 209, 161, 0) 80%)',
  filter: 'blur(200px)',
  zIndex: 0,
  pointerEvents: 'none' as const,
}
