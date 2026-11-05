export default {
  "id": "example",
  "bpm": 132,
  "stepsPerBeat": 4,
  "loop": true,
  "swing": 0,
  "transpose": 0,
  "volume": 1,
  "channels": {
    "lead":    { "inst": "square",   "vol": 0.5, "vibrato": 0.3, "echo": 0.2 },
    "harmony": { "inst": "pulse25",  "vol": 0.3 },
    "bass":    { "inst": "triangle", "vol": 0.8, "octave": -1 },
    "guitar":  { "inst": "distgtr",  "vol": 0.4 },
    "drums":   { "inst": "drums",    "vol": 0.8 }
  },
  "sections": {
    "A": {
      "lead":    "E4 - - - G4 - A4 - | B4 - - - A4 - G4 - | E4 - - - D4 - E4 - | B3 - - - . . . .",
      "harmony": "B3 - - - D4 - E4 - | F#4 - - - E4 - D4 - | B3 - - - A3 - B3 - | F#3 - - - . . . .",
      "bass":    "E3 . E3 . E3 . E3 . | E3 . E3 . D3 . D3 . | C3 . C3 . C3 . C3 . | B2 . B2 . B2 . B2 .",
      "guitar":  "E2+B2 - - - . . E2+B2 . | E2+B2 - - - D3+A3 - - - | C3+G3 - - - . . C3+G3 . | B2+F#3 - - - - - - -",
      "drums":   "k+c . h . s . h . | k . h k s . h . | k . h . s . h . | k k h . s s s+o ."
    },
    "B": {
      "lead":    "G4 - A4 - B4 - D5 - | E5 - - - D5 - B4 - | C5 - B4 - A4 - G4 - | F#4 - - - - - . .",
      "bass":    "G2 . G2 . G2 . G2 . | E2 . E2 . E2 . E2 . | C3 . C3 . A2 . A2 . | B2 . B2 . B2 . B2 .",
      "guitar":  "G2+D3 . G2+D3 . G2+D3 - - - | E2+B2 . E2+B2 . E2+B2 - - - | C3+G3 - - - A2+E3 - - - | B2+F#3 - - - - - . .",
      "drums":   "k . h . s . h . | k . h . s . h . | k . t . s . T . | k . c . t T t T"
    }
  },
  "order": ["A", "A", "B", "A"]
}
