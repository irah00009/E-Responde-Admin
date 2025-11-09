const BASE_COLORS = [
  '#2563EB',
  '#F97316',
  '#10B981',
  '#F43F5E',
  '#6366F1',
  '#F59E0B',
  '#14B8A6',
  '#8B5CF6',
  '#22C55E',
  '#EC4899',
  '#0EA5E9',
  '#A855F7',
  '#34D399',
  '#F87171',
  '#60A5FA',
  '#E11D48',
  '#9333EA',
  '#EA580C',
  '#059669',
  '#1D4ED8'
]

export const buildPalette = (count, alpha = 0.85) => {
  const palette = []
  for (let i = 0; i < count; i += 1) {
    const baseColor = BASE_COLORS[i % BASE_COLORS.length]
    if (alpha >= 1) {
      palette.push(baseColor)
    } else {
      palette.push(`${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
    }
  }
  return palette
}

export const buildBorderPalette = (count) => buildPalette(count, 1)


