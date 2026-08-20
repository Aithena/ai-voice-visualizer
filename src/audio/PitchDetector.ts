import { PITCH_RANGE } from './types'
import { clamp01, computeRms } from './analysis'

const CORRELATION_THRESHOLD = 0.3
const RMS_THRESHOLD = 0.02

export function detectPitch(timeData: ArrayLike<number>, sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return 0
  }

  const length = timeData.length
  if (length < 32) {
    return 0
  }

  const rms = computeRms(timeData)
  if (!(rms > RMS_THRESHOLD)) {
    return 0
  }

  const minLag = Math.max(2, Math.floor(sampleRate / PITCH_RANGE.maxHz))
  const maxLag = Math.min(length - 1, Math.floor(sampleRate / PITCH_RANGE.minHz))
  if (maxLag <= minLag) {
    return 0
  }

  let energy = 0
  for (let i = 0; i < length; i += 1) {
    const sample = timeData[i] ?? 0
    energy += sample * sample
  }
  if (!(energy > 0)) {
    return 0
  }

  let bestLag = -1
  let bestCorrelation = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    const limit = length - lag
    for (let i = 0; i < limit; i += 1) {
      correlation += (timeData[i] ?? 0) * (timeData[i + lag] ?? 0)
    }
    correlation /= energy
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  if (bestLag < 0 || bestCorrelation < CORRELATION_THRESHOLD) {
    return 0
  }

  const frequency = sampleRate / bestLag
  if (!Number.isFinite(frequency) || frequency < PITCH_RANGE.minHz || frequency > PITCH_RANGE.maxHz) {
    return 0
  }

  return clamp01((frequency - PITCH_RANGE.minHz) / (PITCH_RANGE.maxHz - PITCH_RANGE.minHz))
}
