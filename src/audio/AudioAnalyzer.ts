import { computeFrequencyBands, createSpeechActivityTracker, normalizeVolume, computeRms } from './analysis'
import { AudioAnalyzerError, createSilentAudioData, mapStartError, writeSilentAudioData } from './errors'
import { detectPitch } from './PitchDetector'
import type { AudioAnalyzerOptions, AudioData } from './types'

const DEFAULT_FFT_SIZE = 2048
const DEFAULT_SMOOTHING = 0.8

type AnalyzerState = 'idle' | 'starting' | 'running' | 'disposed'

export class AudioAnalyzer {
  private readonly fftSize: number
  private readonly smoothingTimeConstant: number
  private readonly frame: AudioData = createSilentAudioData()
  private readonly speechActivity = createSpeechActivityTracker()

  private state: AnalyzerState = 'idle'
  private startLock: Promise<void> | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private frequencyData: Uint8Array | null = null
  private timeData: Float32Array | null = null

  constructor(options: AudioAnalyzerOptions = {}) {
    this.fftSize = normalizeFftSize(options.fftSize ?? DEFAULT_FFT_SIZE)
    this.smoothingTimeConstant = clampSmoothing(options.smoothingTimeConstant ?? DEFAULT_SMOOTHING)
  }

  get isRunning(): boolean {
    return this.state === 'running'
  }

  async start(): Promise<void> {
    if (this.state === 'disposed') {
      throw new AudioAnalyzerError('DISPOSED', 'AudioAnalyzer has been disposed')
    }
    if (this.state === 'running') {
      return
    }
    if (this.startLock) {
      return this.startLock
    }

    this.state = 'starting'
    const startLock = this.startInternal()
    this.startLock = startLock

    try {
      await startLock
    } catch (error) {
      this.abandonStart()
      throw mapStartError(error)
    } finally {
      if (this.startLock === startLock) {
        this.startLock = null
      }
    }
  }

  stop(): void {
    if (this.state === 'disposed') {
      return
    }

    this.teardownGraph()
    this.speechActivity.reset()
    writeSilentAudioData(this.frame)

    if (this.audioContext && this.audioContext.state !== 'closed') {
      void this.audioContext.suspend().catch(() => undefined)
    }

    this.state = 'idle'
  }

  getAudioData(): AudioData {
    if (this.state !== 'running' || !this.analyserNode || !this.frequencyData || !this.timeData || !this.audioContext) {
      return writeSilentAudioData(this.frame)
    }

    try {
      if (!this.mediaStream || this.mediaStream.getAudioTracks().every((track) => track.readyState !== 'live')) {
        this.speechActivity.reset()
        return writeSilentAudioData(this.frame)
      }

      fillFrequencyData(this.analyserNode, this.frequencyData)
      fillTimeData(this.analyserNode, this.timeData)

      const volume = normalizeVolume(computeRms(this.timeData))
      const bands = computeFrequencyBands(
        this.frequencyData,
        this.audioContext.sampleRate,
        this.analyserNode.fftSize,
      )
      const pitch = detectPitch(this.timeData, this.audioContext.sampleRate)
      const speechActivity = this.speechActivity.update(volume, bands.mid)

      this.frame.volume = volume
      this.frame.bass = bands.bass
      this.frame.mid = bands.mid
      this.frame.treble = bands.treble
      this.frame.pitch = pitch
      this.frame.speechActivity = speechActivity
      return this.frame
    } catch {
      this.speechActivity.reset()
      return writeSilentAudioData(this.frame)
    }
  }

  async dispose(): Promise<void> {
    if (this.state === 'disposed') {
      return
    }

    this.teardownGraph()
    this.speechActivity.reset()
    writeSilentAudioData(this.frame)

    const context = this.audioContext
    this.audioContext = null
    this.state = 'disposed'

    if (context && context.state !== 'closed') {
      await context.close().catch(() => undefined)
    }
  }

  private async startInternal(): Promise<void> {
    assertBrowserAudioSupport()

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })

    if (this.state !== 'starting') {
      stopMediaStream(stream)
      if (this.state === 'disposed') {
        throw new AudioAnalyzerError('DISPOSED', 'AudioAnalyzer was disposed during start')
      }
      return
    }

    try {
      const context = this.audioContext ?? new AudioContext()
      this.audioContext = context

      if (context.state === 'suspended') {
        await context.resume()
      }

      if (context.state === 'suspended') {
        throw new AudioAnalyzerError(
          'CONTEXT_SUSPENDED',
          'AudioContext is still suspended after resume()',
        )
      }

      if (context.state === 'closed') {
        throw new AudioAnalyzerError('INIT_FAILED', 'AudioContext is closed')
      }

      if (this.state !== 'starting') {
        stopMediaStream(stream)
        if (this.state === 'disposed') {
          throw new AudioAnalyzerError('DISPOSED', 'AudioAnalyzer was disposed during start')
        }
        return
      }

      const analyser = context.createAnalyser()
      analyser.fftSize = this.fftSize
      analyser.smoothingTimeConstant = this.smoothingTimeConstant
      analyser.minDecibels = -90
      analyser.maxDecibels = -30

      const source = context.createMediaStreamSource(stream)
      source.connect(analyser)

      this.mediaStream = stream
      this.sourceNode = source
      this.analyserNode = analyser
      this.frequencyData = new Uint8Array(analyser.frequencyBinCount)
      this.timeData = new Float32Array(analyser.fftSize)
      this.speechActivity.reset()
      this.state = 'running'
    } catch (error) {
      stopMediaStream(stream)
      throw error
    }
  }

  private abandonStart(): void {
    this.teardownGraph()
    this.speechActivity.reset()
    writeSilentAudioData(this.frame)
    if (this.state !== 'disposed') {
      this.state = 'idle'
    }
  }

  private teardownGraph(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    stopMediaStream(this.mediaStream)
    this.mediaStream = null
    this.frequencyData = null
    this.timeData = null
  }
}

function assertBrowserAudioSupport(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new AudioAnalyzerError('UNSUPPORTED', 'AudioAnalyzer requires a browser environment')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new AudioAnalyzerError('UNSUPPORTED', 'navigator.mediaDevices.getUserMedia is not available')
  }
  if (typeof AudioContext === 'undefined' && typeof window.AudioContext === 'undefined') {
    throw new AudioAnalyzerError('UNSUPPORTED', 'AudioContext is not available')
  }
}

function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) {
    return
  }
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

function normalizeFftSize(value: number): number {
  const allowed = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
  return allowed.includes(value) ? value : DEFAULT_FFT_SIZE
}

function clampSmoothing(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SMOOTHING
  }
  return Math.min(1, Math.max(0, value))
}

function fillFrequencyData(analyser: AnalyserNode, buffer: Uint8Array): void {
  analyser.getByteFrequencyData(buffer as Parameters<AnalyserNode['getByteFrequencyData']>[0])
}

function fillTimeData(analyser: AnalyserNode, buffer: Float32Array): void {
  analyser.getFloatTimeDomainData(buffer as Parameters<AnalyserNode['getFloatTimeDomainData']>[0])
}
