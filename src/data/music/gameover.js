export default {
  "id": "gameover",
  "bpm": 100,
  "stepsPerBeat": 4,
  "loop": false,
  "swing": 0,
  "transpose": 0,
  "volume": 1.2,
  "channels": {
    "lead": {
      "inst": "square",
      "vol": 0.45,
      "vibrato": 0.6
    },
    "bass": {
      "inst": "bassgtr",
      "vol": 0.6
    },
    "guitar": {
      "inst": "distgtr",
      "vol": 0.4
    },
    "drums": {
      "inst": "drums",
      "vol": 0.8
    }
  },
  "sections": {
    "A": {
      "lead": "G4 - - . F#4 - - . F4 - - . E4 - - - | E4 - - - - - - - - - - - . . . .",
      "bass": "C2 - - . B1 - - . Bb1 - - . A1 - - - | A1 - - - - - - - - - - - . . . .",
      "guitar": "C3+G3 - - . B2+F#3 - - . Bb2+F3 - - . A2+E3 - - - | A2+E3 - - - - - - - - - - - . . . .",
      "drums": "k+c . . . k+s . . . k+s . . . k+c . . . | t . . . . . . . . . . . . . . ."
    },
    "E": {
      "bass": "A1 - . . . . . .",
      "guitar": "A1+E2 - . . . . . .",
      "drums": "k+c . . . . . . ."
    }
  },
  "order": [
    "A",
    "E"
  ]
};
