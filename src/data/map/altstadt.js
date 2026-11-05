export default {
  "name": "altstadt",
  "offset": [0, 0],
  "seed": "freiburg",
  "blocks": [
    [128, 38, 12, 6], [142, 38, 7, 6], [158, 38, 12, 6], [130, 56, 14, 5],
    [158, 54, 12, 5], [176, 54, 12, 5], [158, 78, 12, 5], [176, 78, 12, 5],
    [140, 95, 10, 6], [156, 95, 10, 6]
  ],
  "stores": [["dm", 143, 38], ["lidl", 162, 38], ["alnatura", 134, 56], ["aldi", 162, 78]],
  "ground": [
    {"type": "grass", "rect": [116, 6, 24, 16]},
    {"type": "path", "rect": [116, 13, 24, 2]},
    {"type": "path", "rect": [127, 6, 2, 16]},
    {"type": "slab", "rect": [107, 48, 121, 1]},
    {"type": "slab", "rect": [107, 53, 121, 1]},
    {"type": "rail_h", "rect": [109, 50, 102, 2]},
    {"type": "slab", "rect": [150, 2, 1, 121]},
    {"type": "slab", "rect": [155, 2, 1, 121]},
    {"type": "rail_v", "rect": [152, 2, 2, 121]},
    {"type": "mosaic", "rect": [150, 48, 6, 6]},
    {"type": "mosaic", "rect": [128, 62, 20, 12]},
    {"type": "plaza", "rect": [129, 63, 18, 10]},
    {"type": "plaza", "rect": [158, 59, 30, 18]}
  ],
  "decorations": [
    ["muenster", 172, 72], ["martinstor", 152, 100],
    ["tram_stop", 151, 46], ["tram_stop", 154, 55], ["litfass", 149, 47], ["litfass", 157, 56], ["litfass", 138, 54],
    ["bench", 161, 61], ["bench", 184, 61], ["bench", 161, 75], ["bench", 168, 75], ["bench", 180, 75],
    ["tree", 160, 65], ["tree", 186, 65], ["tree", 160, 72], ["tree", 186, 72],
    ["cafe_set", 165, 76], ["cafe_set", 179, 76], ["planter", 172, 60], ["planter", 166, 60], ["planter", 178, 60],
    ["tree", 130, 64], ["tree", 145, 64], ["tree", 130, 72], ["tree", 145, 72],
    ["cafe_set", 133, 65], ["cafe_set", 137, 65], ["cafe_set", 141, 65], ["cafe_set", 133, 69], ["cafe_set", 141, 69],
    ["planter", 128, 74], ["planter", 147, 74],
    ["bike_rack", 146, 46], ["bike_rack", 160, 46], ["bike_rack", 136, 61], ["bike_rack", 168, 53],
    ["bike", 140, 47], ["bike", 172, 47], ["bike", 157, 86], ["bike", 146, 80],
    ["bin", 149, 30], ["bin", 156, 42], ["bin", 149, 60], ["bin", 156, 70],
    ["street_sign", 149, 44, {"street": "Bertoldstraße"}],
    ["street_sign", 156, 58, {"street": "Kaiser-Joseph-Straße"}],
    ["street_sign", 157, 62, {"street": "Münsterplatz"}],
    ["street_sign", 127, 64, {"street": "Augustinerplatz"}],
    ["street_sign", 186, 47, {"street": "Salzstraße"}],
    ["sign_fussgaengerzone", 149, 20], ["sign_fussgaengerzone", 156, 90],
    ["tree", 119, 8], ["tree", 136, 9], ["tree", 120, 19], ["tree", 137, 19], ["bench", 124, 12], ["bench", 132, 16], ["playground", 122, 9],
    ["street_sign", 129, 15, {"street": "Colombipark"}],
    ["tree", 160, 26], ["bike_rack", 162, 30],
    ["tree", 138, 88], ["tree", 166, 88], ["bench", 144, 84], ["bench", 162, 92],
    ["tree", 160, 112], ["bench", 152, 112], ["tree", 172, 104], ["bike_rack", 178, 110],
    ["tree", 128, 1, {"repeat": 9, "step": [6, 0]}]
  ],
  "lampLines": [
    [150, 6, 150, 118, 10], [155, 11, 155, 118, 10],
    [112, 48, 226, 48, 10], [117, 53, 226, 53, 10],
    [160, 59, 186, 59, 9], [130, 62, 146, 62, 8]
  ],
  "lampClear": [[150, 48, 6, 6]]
}
