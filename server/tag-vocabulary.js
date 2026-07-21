// Fixed tag vocabulary. Nothing outside these lists is ever written to products.json.
export const VOCAB = {
  // 'tank' is not in the brief's category list, but tnk-001 is a sleeveless tank —
  // without it that product can't be described honestly. Drop it if you'd rather file tanks as tshirt.
  category: ['sweater', 'sweatshirt', 'hoodie', 'tshirt', 'tank', 'jacket', 'jeans'],
  colors: ['black', 'charcoal', 'grey', 'white', 'cream', 'ivory', 'beige', 'brown', 'navy', 'blue', 'olive', 'green', 'red', 'maroon', 'pink', 'purple', 'yellow', 'orange', 'multicolor'],
  fabric: ['cotton', 'jersey', 'rib-knit', 'fleece', 'wool', 'wool-blend', 'acrylic-blend', 'denim', 'corduroy', 'linen', 'nylon', 'polyester-blend'],
  fit: ['regular', 'slim', 'relaxed', 'oversized', 'boxy', 'cropped'],
  occasions: ['casual', 'college', 'office', 'travel', 'party', 'lounge'],
  season: ['summer', 'monsoon', 'winter', 'all-season'],
  style_vibe: ['minimal', 'streetwear', 'sporty', 'classic', 'oversized'],
  formality: ['casual', 'smart-casual', 'semi-formal', 'formal'],
  pairs_with: ['jeans', 'chinos', 'joggers', 'shorts', 'cargos', 'skirt', 'sneakers', 'boots', 'loafers', 'jacket', 'overshirt', 'cap', 'tote-bag'],
};

// which keys hold arrays vs a single value
export const MULTI = ['colors', 'occasions', 'pairs_with'];
