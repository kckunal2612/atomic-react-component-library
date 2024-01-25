import {
  SimpleAudioPlayer,
  AudioPlayerState,
} from "./path-to-your-file/SimpleAudioPlayer";

// Mock the global AudioContext
const mockAudioContext = {
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
  })),
  decodeAudioData: jest.fn(),
  destination: null,
  currentTime: 0,
  state: "suspended",
};

jest.mock("path-to-your-file/SimpleAudioPlayer", () => {
  return {
    SimpleAudioPlayer: jest.fn().mockImplementation(() => ({
      audioContext: mockAudioContext,
      audioBuffer: null,
      source: null,
      startTime: 0,
      pausedTime: 0,
      progressCallback: null,
      state: AudioPlayerState.IDLE,
      stateChangeCallback: null,

      loadAudio: jest.fn(),
      getAudioDuration: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      seek: jest.fn(),
      onStateChange: jest.fn(),
    })),
    AudioPlayerState,
  };
});

describe("SimpleAudioPlayer", () => {
  let audioPlayer: SimpleAudioPlayer;

  beforeEach(() => {
    audioPlayer = new SimpleAudioPlayer();
  });

  describe("loadAudio", () => {
    it("should load audio successfully", async () => {
      const audioUrl = "path-to-your-audio-file.mp3";

      // Mock successful fetch and decodeAudioData
      global.fetch = jest.fn(() =>
        Promise.resolve({
          arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
        })
      );
      mockAudioContext.decodeAudioData.mockResolvedValueOnce({} as AudioBuffer);

      await audioPlayer.loadAudio(audioUrl);

      expect(global.fetch).toHaveBeenCalledWith(audioUrl);
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(audioPlayer.onStateChange).toHaveBeenCalledWith(
        AudioPlayerState.IDLE
      );
    });

    it("should handle loading error", async () => {
      const audioUrl = "path-to-your-audio-file.mp3";

      // Mock fetch error
      global.fetch = jest.fn(() => Promise.reject("Fetch error"));

      await audioPlayer.loadAudio(audioUrl);

      expect(global.fetch).toHaveBeenCalledWith(audioUrl);
      expect(audioPlayer.onStateChange).toHaveBeenCalledWith(
        AudioPlayerState.ERROR
      );
    });
  });

  // Add tests for other methods (getAudioDuration, play, pause, resume, stop, seek) and edge cases

  // ...
});
