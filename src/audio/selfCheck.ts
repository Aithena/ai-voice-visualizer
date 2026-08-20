import { AudioAnalyzer } from './AudioAnalyzer'
import { bandEnergy, clamp01, computeRms, createSpeechActivityTracker, normalizeVolume } from './analysis'
import { AudioAnalyzerError, mapStartError } from './errors'
import { detectPitch } from './PitchDetector'
import { FREQUENCY_BANDS } from './types'

export async function runAudioFoundationSelfCheck(): Promise<void> {
  assertEqual('clamp01 lower bound', clamp01(-4), 0)
  assertEqual('clamp01 upper bound', clamp01(4), 1)
  assertEqual('clamp01 mid', clamp01(0.25), 0.25)
  assertEqual('clamp01 NaN', clamp01(Number.NaN), 0)
  assertEqual('clamp01 Infinity', clamp01(Number.POSITIVE_INFINITY), 0)

  assertEqual('rms silence', computeRms([0, 0, 0, 0]), 0)
  assertClose('rms unit square', computeRms([1, -1, 1, -1]), 1, 1e-9)
  assertEqual('volume silence', normalizeVolume(0), 0)
  assertEqual('volume clip', normalizeVolume(1), 1)

  const fftSize = 2048
  const sampleRate = 44100
  const frequencyData = new Uint8Array(fftSize / 2)
  const binHz = sampleRate / fftSize
  const bassBin = Math.round(120 / binHz)
  frequencyData[bassBin] = 255

  const bass = bandEnergy(
    frequencyData,
    sampleRate,
    fftSize,
    FREQUENCY_BANDS.bass.minHz,
    FREQUENCY_BANDS.bass.maxHz,
  )
  const mid = bandEnergy(
    frequencyData,
    sampleRate,
    fftSize,
    FREQUENCY_BANDS.mid.minHz,
    FREQUENCY_BANDS.mid.maxHz,
  )
  const treble = bandEnergy(
    frequencyData,
    sampleRate,
    fftSize,
    FREQUENCY_BANDS.treble.minHz,
    FREQUENCY_BANDS.treble.maxHz,
  )

  if (!(bass > 0)) {
    throw new Error('expected bass energy from 120 Hz bin')
  }
  assertEqual('mid isolated from bass bin', mid, 0)
  assertEqual('treble isolated from bass bin', treble, 0)

  assertEqual('pitch silence', detectPitch(new Float32Array(2048), sampleRate), 0)

  const tone = createSine(220, sampleRate, 2048, 0.35)
  const pitch = detectPitch(tone, sampleRate)
  const expected = (220 - 80) / (500 - 80)
  assertClose('pitch 220Hz', pitch, expected, 0.12)
  assertEqual('pitch NaN input', detectPitch(Float32Array.from({ length: 2048 }, () => Number.NaN), sampleRate), 0)

  const speech = createSpeechActivityTracker()
  assertEqual('speech idle', speech.update(0, 0), 0)
  if (!(speech.update(0.4, 0.3) > 0)) {
    throw new Error('expected speechActivity to rise with volume and mid energy')
  }
  speech.reset()
  assertEqual('speech reset', speech.update(0, 0), 0)

  const denied = mapStartError({ name: 'NotAllowedError', message: 'denied' })
  assertEqual('permission error code', denied.code, 'PERMISSION_DENIED')
  assertEqual('device error code', mapStartError({ name: 'NotFoundError', message: 'missing' }).code, 'DEVICE_NOT_FOUND')

  const analyzer = new AudioAnalyzer()
  const silent = analyzer.getAudioData()
  assertEqual('idle volume', silent.volume, 0)
  assertEqual('idle bass', silent.bass, 0)
  assertEqual('idle mid', silent.mid, 0)
  assertEqual('idle treble', silent.treble, 0)
  assertEqual('idle pitch', silent.pitch, 0)
  assertEqual('idle speech', silent.speechActivity, 0)

  await assertRejectsCode(() => analyzer.start(), 'UNSUPPORTED')
  assertEqual('failed start remains idle', analyzer.isRunning, false)
  assertEqual('failed start stays silent', analyzer.getAudioData().volume, 0)

  analyzer.stop()
  analyzer.stop()
  await analyzer.dispose()
  await analyzer.dispose()
  await assertRejectsCode(() => analyzer.start(), 'DISPOSED')
  analyzer.stop()
  assertEqual('disposed stays silent', analyzer.getAudioData().volume, 0)
}

function createSine(frequency: number, sampleRate: number, length: number, amplitude: number): Float32Array {
  const data = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    data[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return data
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

function assertClose(label: string, actual: number, expected: number, tolerance: number): void {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ~${expected} ±${tolerance}, received ${actual}`)
  }
}

async function assertRejectsCode(run: () => Promise<void>, code: string): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AudioAnalyzerError && error.code === code) {
      return
    }
    throw new Error(`expected AudioAnalyzerError(${code}), received ${String(error)}`)
  }
  throw new Error(`expected AudioAnalyzerError(${code}), but start() resolved`)
}
