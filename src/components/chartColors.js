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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const hexToRgb = (hex) => {
  const sanitized = hex.replace('#', '')
  const padded = sanitized.length === 3
    ? sanitized.split('').map(char => char + char).join('')
    : sanitized
  const bigint = parseInt(padded, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

const rgbToHsl = ({ r, g, b }) => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h
  let s
  const l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
        break
      case gNorm:
        h = (bNorm - rNorm) / d + 2
        break
      default:
        h = (rNorm - gNorm) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const ensureHslObject = (color) => {
  if (color.startsWith('#')) {
    return rgbToHsl(hexToRgb(color))
  }
  const hslMatch = color.match(/hsl[a]?\(([^)]+)\)/i)
  if (!hslMatch) {
    return { h: 0, s: 70, l: 55 }
  }
  const tokens = hslMatch[1]
    .replace(/\//g, ' ')
    .split(/\s+/)
    .map(part => part.replace('%', '').trim())
    .filter((token) => token.length > 0)
  const [hPart, sPart, lPart] = tokens
  return {
    h: Number(hPart),
    s: Number(sPart),
    l: Number(lPart)
  }
}

const toHslaString = ({ h, s, l }, alpha) => `hsla(${h} ${s}% ${l}% / ${alpha})`

const adjustShade = (color, iteration) => {
  const hsl = ensureHslObject(color)
  // Alternate between lightening and darkening across iterations for better separation
  const direction = iteration % 2 === 0 ? 1 : -1
  const magnitude = Math.floor(iteration / 2) + 1
  const lightnessShift = direction * Math.min(10 + magnitude * 5, 25)
  const saturationShift = direction * Math.min(5 + magnitude * 2, 15)
  return {
    h: (hsl.h + iteration * 12) % 360,
    s: clamp(hsl.s - saturationShift, 40, 90),
    l: clamp(hsl.l + lightnessShift, 20, 80)
  }
}

const getColorByIndex = (index) => {
  const base = BASE_COLORS[index % BASE_COLORS.length]
  const iteration = Math.floor(index / BASE_COLORS.length)
  if (iteration === 0) {
    return base
  }
  return toHslaString(adjustShade(base, iteration), 1)
}

export const buildPalette = (count, alpha = 0.85) => {
  const palette = []
  for (let i = 0; i < count; i += 1) {
    const baseColor = getColorByIndex(i)
    const hsl = ensureHslObject(baseColor)
    palette.push(toHslaString(hsl, alpha))
  }
  return palette
}

export const buildBorderPalette = (count) => buildPalette(count, 1)


