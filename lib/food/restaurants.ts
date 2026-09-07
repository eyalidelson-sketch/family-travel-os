// A small curated "nearby restaurants" dataset standing in for a real
// places/reservations API — same honest-placeholder pattern as
// lib/providers/places.ts and lib/enrichment/curated.ts. Tags describe
// flavor/style (matched against soft FoodPreference likes/dislikes);
// `dietary` describes hard facts (matched against FoodRestriction — the
// only thing that can ever drive a match to 0%).

export interface Restaurant {
  id: string;
  name: string;
  city: string; // matches Place.city / a Day's cityHint, e.g. "Tokyo"
  cuisine: string;
  priceLevel: 1 | 2 | 3;
  description: string;
  tags: string[];
  dietary: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    /** Keywords this menu is known to contain — matched against an allergy restriction's own label. */
    containsAllergens?: string[];
  };
}

export const RESTAURANTS: Restaurant[] = [
  // Tokyo
  {
    id: "tokyo-ichiran-shinjuku",
    name: "Ichiran Shinjuku",
    city: "Tokyo",
    cuisine: "Ramen",
    priceLevel: 1,
    description: "Solo-booth tonkotsu ramen chain — order your broth richness and spice level on a paper form, no small talk required.",
    tags: ["ramen", "noodles", "pork", "spicy-adjustable", "quick"],
    dietary: { containsAllergens: ["pork", "gluten", "soy"] }
  },
  {
    id: "tokyo-sushi-nakazawa",
    name: "Sushi no Midori",
    city: "Tokyo",
    cuisine: "Sushi",
    priceLevel: 2,
    description: "A bright, casual conveyor-adjacent sushi counter popular with families — good quality without the omakase price tag.",
    tags: ["sushi", "seafood", "mild"],
    dietary: { containsAllergens: ["shellfish", "fish", "soy"] }
  },
  {
    id: "tokyo-vege-herbivore",
    name: "Herbivore Kitchen Shibuya",
    city: "Tokyo",
    cuisine: "Vegetarian Japanese",
    priceLevel: 2,
    description: "A plant-based izakaya doing vegetarian and vegan takes on Japanese comfort food, with clearly marked gluten-free noodles.",
    tags: ["vegetarian", "noodles", "mild"],
    dietary: { vegetarian: true, vegan: true, glutenFree: true }
  },
  {
    id: "tokyo-seafood-stew-house",
    name: "Uogashi Nabe",
    city: "Tokyo",
    cuisine: "Seafood hot pot",
    priceLevel: 2,
    description: "A hot-pot house built around a rotating seafood stew — the house specialty is the thing to get.",
    tags: ["seafood", "stew", "mild"],
    dietary: { containsAllergens: ["shellfish", "fish"] }
  },
  // Kyoto
  {
    id: "kyoto-gion-kappo",
    name: "Gion Kappo Table",
    city: "Kyoto",
    cuisine: "Kaiseki-style",
    priceLevel: 3,
    description: "A relaxed, family-friendly take on kaiseki course dining — smaller portions and a shorter course available for kids.",
    tags: ["seafood", "mild", "seasonal"],
    dietary: { containsAllergens: ["fish", "shellfish", "soy"] }
  },
  {
    id: "kyoto-tofu-nanzenji",
    name: "Nanzenji Tofu Kitchen",
    city: "Kyoto",
    cuisine: "Tofu / vegetarian",
    priceLevel: 2,
    description: "Multi-course tofu cuisine near Nanzen-ji temple — a Kyoto specialty that happens to be entirely vegetarian.",
    tags: ["vegetarian", "mild", "tofu"],
    dietary: { vegetarian: true, vegan: true, glutenFree: true }
  },
  {
    id: "kyoto-ramen-gion",
    name: "Gion Ramen Koji",
    city: "Kyoto",
    cuisine: "Ramen",
    priceLevel: 1,
    description: "A small counter shop doing a rich miso ramen with a optional extra-spicy version.",
    tags: ["ramen", "noodles", "spicy-adjustable"],
    dietary: { containsAllergens: ["pork", "gluten", "soy"] }
  },
  {
    id: "kyoto-family-bbq",
    name: "Kyoto Yakiniku Ichi",
    city: "Kyoto",
    cuisine: "Japanese BBQ",
    priceLevel: 2,
    description: "Tabletop grill-your-own beef and vegetables — a fun, hands-on format for kids.",
    tags: ["bbq", "korean-bbq-adjacent", "spicy-medium"],
    dietary: { containsAllergens: ["beef", "soy", "sesame"] }
  },
  // Seoul
  {
    id: "seoul-myeongdong-bbq",
    name: "Myeongdong Galmaegi House",
    city: "Seoul",
    cuisine: "Korean BBQ",
    priceLevel: 2,
    description: "A busy, family-loud Korean BBQ spot right in Myeongdong — pork skirt steak is the specialty.",
    tags: ["korean-bbq", "spicy-medium", "grilled"],
    dietary: { containsAllergens: ["pork", "soy", "sesame"] }
  },
  {
    id: "seoul-noodle-bar",
    name: "Insadong Noodle Bar",
    city: "Seoul",
    cuisine: "Noodles",
    priceLevel: 1,
    description: "Hand-pulled noodle bar with a mild broth option built specifically for kids and spice-sensitive eaters.",
    tags: ["noodles", "mild"],
    dietary: { containsAllergens: ["gluten", "soy"] }
  },
  {
    id: "seoul-vegan-temple",
    name: "Temple Table Vegan Kitchen",
    city: "Seoul",
    cuisine: "Temple-style vegetarian",
    priceLevel: 2,
    description: "Korean temple cuisine — entirely plant-based, mild seasoning, and used to accommodating dietary restrictions.",
    tags: ["vegetarian", "mild"],
    dietary: { vegetarian: true, vegan: true, glutenFree: true }
  },
  {
    id: "seoul-seafood-stew",
    name: "Noryangjin Maeuntang",
    city: "Seoul",
    cuisine: "Spicy seafood stew",
    priceLevel: 2,
    description: "A no-frills spot built entirely around maeuntang — Korea's fiery red seafood stew.",
    tags: ["seafood", "stew", "spicy-high"],
    dietary: { containsAllergens: ["shellfish", "fish"] }
  },
  {
    id: "seoul-fried-chicken",
    name: "Myeongdong Crispy Chicken",
    city: "Seoul",
    cuisine: "Korean fried chicken",
    priceLevel: 1,
    description: "A soy-garlic and a mild option alongside the classic spicy glaze — reliably a hit with kids.",
    tags: ["fried-chicken", "spicy-adjustable", "mild"],
    dietary: { containsAllergens: ["gluten", "soy"] }
  },
  // Busan
  {
    id: "busan-seafood-market",
    name: "Jagalchi Market Grill",
    city: "Busan",
    cuisine: "Fresh seafood",
    priceLevel: 2,
    description: "Pick your fish at Jagalchi Market's stalls and have it grilled or made into stew upstairs.",
    tags: ["seafood", "stew", "spicy-medium"],
    dietary: { containsAllergens: ["shellfish", "fish"] }
  },
  {
    id: "busan-milmyeon",
    name: "Busan Milmyeon House",
    city: "Busan",
    cuisine: "Cold noodles",
    priceLevel: 1,
    description: "Busan's own cold wheat noodle dish — light, mild, and popular as a hot-day lunch.",
    tags: ["noodles", "mild"],
    dietary: { containsAllergens: ["gluten"] }
  },
  {
    id: "busan-bbq-haeundae",
    name: "Haeundae BBQ Table",
    city: "Busan",
    cuisine: "Korean BBQ",
    priceLevel: 2,
    description: "A beachside BBQ spot with an outdoor terrace — good for a family dinner after the beach.",
    tags: ["korean-bbq", "grilled", "spicy-medium"],
    dietary: { containsAllergens: ["pork", "soy", "sesame"] }
  },
  // Jeju
  {
    id: "jeju-black-pork",
    name: "Jeju Heukdwaeji Grill",
    city: "Jeju",
    cuisine: "Jeju black pork BBQ",
    priceLevel: 2,
    description: "Jeju's famous black-pork BBQ, grilled tableside — the island's signature dish.",
    tags: ["bbq", "korean-bbq", "grilled", "spicy-medium"],
    dietary: { containsAllergens: ["pork", "soy", "sesame"] }
  },
  {
    id: "jeju-noodle-hideaway",
    name: "Jeju Noodle Hideaway",
    city: "Jeju",
    cuisine: "Noodles",
    priceLevel: 1,
    description: "A quiet noodle shop with a mild seafood broth and a plain-broth option for picky eaters.",
    tags: ["noodles", "mild", "seafood"],
    dietary: { containsAllergens: ["shellfish", "gluten"] }
  },
  {
    id: "jeju-vegetarian-garden",
    name: "Halla Garden Table",
    city: "Jeju",
    cuisine: "Vegetarian Korean",
    priceLevel: 2,
    description: "A farm-to-table restaurant near Hallasan built around Jeju's vegetable harvest — mild banchan spread.",
    tags: ["vegetarian", "mild"],
    dietary: { vegetarian: true, vegan: true, glutenFree: true }
  }
];

export function restaurantsForCity(city: string): Restaurant[] {
  const needle = city.trim().toLowerCase();
  return RESTAURANTS.filter((r) => r.city.toLowerCase() === needle);
}

export function citiesWithRestaurants(): string[] {
  return [...new Set(RESTAURANTS.map((r) => r.city))];
}
