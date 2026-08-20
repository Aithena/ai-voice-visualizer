import { FREQUENCY_BANDS } from './types'

const VOLUME_RMS_REFERENCE = 0.25

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value <= 0) {
    return 0
  }
  if (value >= 1) {
    return 1
  }
  return value
}

export function computeRms(timeData: ArrayLike<number>): number {
  const length = timeData.length
  if (length === 0) {
    return 0
  }

  let sumSquares = 0
  for (let i = 0; i < length; i += 1) {
    const sample = timeData[i] ?? 0
    sumSquares += sample * sample
  }

  return Math.sqrt(sumSquares / length)
}

export function normalizeVolume(rms: number): number {
  return clamp01(rms / VOLUME_RMS_REFERENCE)
}

export function bandEnergy(
  frequencyData: ArrayLike<number>,
  sampleRate: number,
  fftSize: number,
  minHz: number,
  maxHz: number,
): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(fftSize) || fftSize <= 0) {
    return 0
  }

  const binCount = frequencyData.length
  if (binCount === 0) {
    return 0
  }

  const binHz = sampleRate / fftSize
  const start = Math.max(0, Math.floor(minHz / binHz))
  const end = Math.min(binCount - 1, Math.ceil(maxHz / binHz))
  if (end < start) {
    return 0
  }

  let sum = 0
  let count = 0
  for (let i = start; i <= end; i += 1) {
    const magnitude = frequencyData[i] ?? 0
    sum += magnitude / 255
    count += 1
  }

  return count === 0 ? 0 : clamp01(sum / count)
}

export function computeFrequencyBands(
  frequencyData: ArrayLike<number>,
  sampleRate: number,
  fftSize: number,
): { bass: number; mid: number; treble: number } {
  return {
    bass: bandEnergy(
      frequencyData,
      sampleRate,
      fftSize,
      FREQUENCY_BANDS.bass.minHz,
      FREQUENCY_BANDS.bass.maxHz,
    ),
    mid: bandEnergy(
      frequencyData,
      sampleRate,
      fftSize,
      FREQUENCY_BANDS.mid.minHz,
      FREQUENCY_BANDS.mid.maxHz,
    ),
    treble: bandEnergy(
      frequencyData,
      sampleRate,
      fftSize,
      FREQUENCY_BANDS.treble.minHz,
      FREQUENCY_BANDS.treble.maxHz,
    ),
  }
}

export function createSpeechActivityTracker(): {
  reset: () => void
  update: (volume: number, mid: number) => number
} {
  let smoothed = 0

  return {
    reset(): void {
      smoothed = 0
    },
    update(volume: number, mid: number): number {
      const instant = volume > 0.06 && mid > 0.04 ? Math.max(volume, mid) : 0
      const alpha = instant > smoothed ? 0.45 : 0.12
      smoothed += (instant - smoothed) * alpha
      if (smoothed < 0.01) {
        smoothed = 0
      }
      return clamp01(smoothed)
    },
  }
}
