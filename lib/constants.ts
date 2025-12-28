/**
 * Application-wide constants and configuration
 */

export const APP_CONFIG = {
  MAX_INPUT_LENGTH: 2000,
  MAX_MESSAGES_TO_STORE: 1000,
  CHAT_HISTORY_KEY: 'chat-history',
  LOADING_BUBBLE_DELAY_MS: 300,
  STREAM_TIMEOUT_MS: 60000,
  TTS_FALLBACK_DELAY_MS: 2500,
  TTS_SLOW_RATE: 0.95,
  STT_MAX_ATTEMPTS: 2,
  TTS_MAX_ATTEMPTS: 2,
  STT_RETRY_DELAY_MS: 350,
  TTS_RETRY_DELAY_MS: 300,
  AUDIO_CHUNK_SIZE_MS: 250,
  SILENCE_DURATION_MS: 2000,
  VAD_CALIBRATION_SAMPLES: 30,
  VAD_THRESHOLD_MULTIPLIER: 1.8,
  MIN_AUDIO_BLOB_SIZE: 100,
} as const

export const AUDIO_CONFIG = {
  SUPPORTED_MIME_TYPES: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ],
  RECORDING_OPTIONS: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
} as const

export const UI_CONFIG = {
  TEXTAREA_MAX_HEIGHT: 120,
  TEXTAREA_MIN_HEIGHT: 48,
  MESSAGE_ANIMATION_DURATION: 200,
  COPY_FEEDBACK_DURATION_MS: 2000,
} as const

export const ERROR_MESSAGES = {
  MICROPHONE_ACCESS_DENIED: 'Der Mikrofonzugriff wurde blockiert. Bitte erlaube den Zugriff in den Browsereinstellungen.',
  MICROPHONE_NOT_FOUND: 'Es wurde kein Mikrofon gefunden. Bitte verbinde ein Mikrofon.',
  MICROPHONE_IN_USE: 'Das Mikrofon wird bereits von einer anderen Anwendung verwendet.',
  RECORDING_FAILED: 'Bei der Aufnahme ist ein Fehler aufgetreten. Bitte versuch es erneut.',
  STT_FAILED: 'Die Spracherkennung ist fehlgeschlagen. Bitte versuch es erneut.',
  TTS_FAILED: 'Die Audioausgabe konnte nicht erzeugt werden. Bitte versuch es erneut.',
  NETWORK_ERROR: 'Netzwerkfehler. Bitte überprüfe deine Internetverbindung.',
  GENERIC_ERROR: 'Ein Fehler ist aufgetreten. Bitte versuch es erneut.',
} as const

export const SUCCESS_MESSAGES = {
  MESSAGE_SENT: 'Nachricht gesendet',
  MESSAGE_COPIED: 'Nachricht kopiert',
  CHAT_CLEARED: 'Chatverlauf gelöscht',
} as const

/**
 * Tables allowed for write operations (insert, update, delete)
 */
export const INSERT_ALLOWED_TABLES = new Set([
  't_projects',
  't_morningplan',
  't_morningplan_staff',
  't_vehicles',
  't_employees',
  't_services',
  't_materials',
])

