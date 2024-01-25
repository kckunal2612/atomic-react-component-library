/*
SAMPLE USAGE -
import { SimpleAudioPlayer, AudioPlayerState } from './path-to-your-file/SimpleAudioPlayer';

// Create an instance of SimpleAudioPlayer
const audioPlayer = new SimpleAudioPlayer();

// Load an audio file
const audioUrl = 'path-to-your-audio-file.mp3';
audioPlayer.loadAudio(audioUrl).then(() => {
  // Get the duration of the loaded audio
  const duration = audioPlayer.getAudioDuration();
  console.log('Audio Duration:', duration, 'seconds');

  // Define a callback for state changes
  const handleStateChange = (state: AudioPlayerState) => {
    console.log('State:', state);
  };

  // Set the state change callback
  audioPlayer.onStateChange(handleStateChange);

  // Play the audio from the beginning
  audioPlayer.play();

  // Pause after 5 seconds
  setTimeout(() => {
    audioPlayer.pause();
  }, 5000);

  // Resume after another 2 seconds
  setTimeout(() => {
    audioPlayer.resume();
  }, 7000);

  // Seek to a specific position after 10 seconds
  setTimeout(() => {
    audioPlayer.seek(15);
  }, 10000);

  // Stop after 20 seconds
  setTimeout(() => {
    audioPlayer.stop();
  }, 20000);
});

*/

/**
 * Enum representing different states of the audio player.
 * @enum {string}
 */
enum AudioPlayerState {
  IDLE = "idle",
  LOADING = "loading",
  PLAYING = "playing",
  PAUSED = "paused",
  FINISHED = "finished",
  ERROR = "error",
}

/**
 * Interface representing the methods of a simple audio player.
 */
interface ISimpleAudioPlayer {
  loadAudio(url: string): Promise<void>;
  getAudioDuration(): number;
  play(position?: number, onProgress?: (progress: number) => void): void;
  pause(): void;
  resume(): void;
  stop(): void;
  seek(position: number): void;
  onStateChange(callback: (state: AudioPlayerState) => void): void;
}

/**
 * SimpleAudioPlayer class for basic audio playback control using the Web Audio API.
 */
class SimpleAudioPlayer implements ISimpleAudioPlayer {
  /**
   * @private
   * @type {AudioContext | null}
   */
  private audioContext: AudioContext | null;

  /**
   * @private
   * @type {AudioBuffer | null}
   */
  private audioBuffer: AudioBuffer | null;

  /**
   * @private
   * @type {AudioBufferSourceNode | null}
   */
  private source: AudioBufferSourceNode | null;

  /**
   * @private
   * @type {number}
   */
  private startTime: number;

  /**
   * @private
   * @type {number}
   */
  private pausedTime: number;

  /**
   * @private
   * @type {((progress: number) => void) | null}
   */
  private progressCallback: ((progress: number) => void) | null;

  /**
   * @private
   * @type {AudioPlayerState}
   */
  private state: AudioPlayerState;

  /**
   * @private
   * @type {((state: AudioPlayerState) => void) | null}
   */
  private stateChangeCallback: ((state: AudioPlayerState) => void) | null;

  /**
   * Creates an instance of SimpleAudioPlayer.
   * Initializes the audioContext and other properties.
   */
  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    this.audioBuffer = null;
    this.source = null;
    this.startTime = 0;
    this.pausedTime = 0;
    this.progressCallback = null;
    this.state = AudioPlayerState.IDLE;
    this.stateChangeCallback = null;
  }

  /**
   * Loads audio from the provided URL.
   * @param {string} url - The URL of the audio file.
   * @returns {Promise<void>} A Promise that resolves when the audio is loaded.
   */
  async loadAudio(url: string): Promise<void> {
    this.setState(AudioPlayerState.LOADING);

    try {
      const response = await fetch(url);
      const audioData = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext!.decodeAudioData(audioData);
      this.setState(AudioPlayerState.IDLE);
    } catch (error) {
      console.error("Error loading audio:", error);
      this.setState(AudioPlayerState.ERROR);
    }
  }

  /**
   * Gets the duration of the loaded audio.
   * @returns {number} The duration of the loaded audio in seconds.
   */
  getAudioDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  /**
   * Plays audio from the specified position.
   * @param {number} [position=0] - The position from which to start playback in seconds.
   * @param {function} [onProgress] - A callback function to be called on progress updates.
   */
  play(position: number = 0, onProgress?: (progress: number) => void): void {
    if (this.audioBuffer) {
      this.progressCallback = onProgress || null;

      this.source = this.audioContext!.createBufferSource();
      this.source.buffer = this.audioBuffer;

      this.source.connect(this.audioContext!.destination);
      this.source.onended = () => {
        this.setState(AudioPlayerState.FINISHED);
        this.progressCallback && this.progressCallback(1); // Notify completion
      };

      if (this.pausedTime > 0) {
        this.startTime =
          this.audioContext!.currentTime - (position - this.pausedTime);
      } else {
        this.startTime = this.audioContext!.currentTime - position;
      }

      this.source.start(0, position);

      this.setState(AudioPlayerState.PLAYING);
      this.scheduleProgressCallback();
    }
  }

  /**
   * Pauses the audio playback.
   */
  pause(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (error) {
        console.warn("Cannot stop the source: It wasn't playing.");
      }

      this.pausedTime = this.audioContext!.currentTime - this.startTime;
      this.setState(AudioPlayerState.PAUSED);
      this.updateProgress(); // Ensure progress callback reflects the current position
    }
  }

  /**
   * Resumes audio playback from the paused state.
   */
  resume(): void {
    if (this.source && this.pausedTime > 0) {
      this.play(this.pausedTime);
      this.pausedTime = 0;
    }
  }

  /**
   * Stops the audio playback.
   */
  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (error) {
        console.warn("Cannot stop the source: It wasn't playing.");
      }

      this.pausedTime = 0;
      this.setState(AudioPlayerState.IDLE);
      this.updateProgress(); // Ensure progress callback reflects the current position
    }
  }

  /**
   * Seeks to a specific position in the audio.
   * @param {number} position - The position to seek to in seconds.
   */
  seek(position: number): void {
    if (this.source) {
      const isPlaying = this.audioContext!.state === "running";

      try {
        if (!isPlaying) {
          this.source.stop();
        }
      } catch (error) {
        console.warn("Cannot stop the source: It wasn't playing.");
      }

      this.startTime = this.audioContext!.currentTime - position;
      this.source.start(0, position);

      if (isPlaying) {
        this.setState(AudioPlayerState.PLAYING);
        this.scheduleProgressCallback();
      } else {
        this.setState(AudioPlayerState.PAUSED);
      }
    }
  }

  /**
   * Updates the progress and invokes the progress callback if available.
   * @private
   */
  private updateProgress(): void {
    if (this.progressCallback && this.source && this.audioBuffer) {
      const currentTime = this.audioContext!.currentTime - this.startTime;
      const progress = currentTime / this.audioBuffer.duration;
      this.progressCallback(progress);
    }
  }

  /**
   * Schedules periodic updates for the progress callback.
   * @private
   */
  private scheduleProgressCallback(): void {
    if (this.source) {
      setInterval(() => {
        this.updateProgress();
      }, 100);
    }
  }

  /**
   * Sets the current state and notifies the state change callback.
   * @param {AudioPlayerState} newState - The new state of the audio player.
   * @private
   */
  private setState(newState: AudioPlayerState): void {
    this.state = newState;
    this.stateChangeCallback && this.stateChangeCallback(newState);
  }

  /**
   * Sets a callback function to be called on state changes.
   * @param {function} callback - The callback function to handle state changes.
   */
  onStateChange(callback: (state: AudioPlayerState) => void): void {
    this.stateChangeCallback = callback;
  }
}

export { SimpleAudioPlayer, AudioPlayerState };
