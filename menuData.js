/**
 * Base de Datos Modular de Productos, Promociones y Perfiles de Negocio
 * Menú Digital Fresco, Claro & Blanco / Nocturno
 */

export const BUSINESS_PROFILES = {
  RESTAURANT: {
    id: "restaurant",
    name: "Gourmet Bistro & Grill",
    tagline: "Cocina Fresca, Natural & Sabores de Estación",
    currencySymbol: "$",
    theme: "restaurant",
    heroBadge: "RESTAURANTE FRESCO 2026",
    categories: [
      { id: "all", name: "Todas las Opciones", icon: "sparkles" },
      { id: "entradas", name: "Entradas & Ensaladas", icon: "salad" },
      { id: "principales", name: "Platos Principales", icon: "flame" },
      { id: "cocteleria", name: "Coctelería & Vinos", icon: "glass-water" },
      { id: "postres", name: "Postres del Día", icon: "cake" }
    ],
    promoBanners: [
      {
        id: "banner-rest-01",
        enabled: true,
        type: "happy_hour",
        badge: "HAPPY HOUR 2X1",
        title: "2x1 en Coctelería de Autor",
        subtitle: "Todos los días de 18:00 a 20:30 hs en nuestra barra principal.",
        image: "assets/images/specialty_coffee.png",
        buttonText: "Ver Tragos",
        targetCategory: "cocteleria"
      },
      {
        id: "banner-rest-02",
        enabled: true,
        type: "bancaria",
        badge: "PROMO BANCARIA 20% OFF",
        title: "20% de Descuento con Banco Galicia & MercadoPago",
        subtitle: "Aplica pagando con QR de lunes a jueves. Sin tope de reintegro.",
        image: "assets/images/fresh_salmon.png",
        buttonText: "Ver Detalles",
        targetCategory: "principales"
      },
      {
        id: "banner-rest-03",
        enabled: true,
        type: "especial",
        badge: "RECOMENDACIÓN DEL CHEF",
        title: "Salmón a la Manteca de Limón & Espárragos",
        subtitle: "Corte magro de pesca sustentable a la plancha con aliño de eneldo fresco.",
        image: "assets/images/fresh_salmon.png",
        buttonText: "Probar Plato",
        targetItem: "rest-01"
      }
    ]
  },
  BAKERY_CAFE: {
    id: "bakery_cafe",
    name: "Maison Cafe & Bakery",
    tagline: "Café de Especialidad, Brunchs & Pastelería Fresca",
    currencySymbol: "$",
    theme: "bakery_cafe",
    heroBadge: "BEST BRUNCH 2026",
    categories: [
      { id: "all", name: "Todas las Opciones", icon: "sparkles" },
      { id: "pasteleria", name: "Pancakes & Tartas", icon: "cake" },
      { id: "cafe_especialidad", name: "Café & Bebidas", icon: "coffee" },
      { id: "brunch", name: "Brunch & Toast", icon: "sandwich" },
      { id: "bebidas_frias", name: "Cold Brew & Jugos", icon: "ice-cube" }
    ],
    promoBanners: [
      {
        id: "banner-cafe-01",
        enabled: true,
        type: "bancaria",
        badge: "MERIENDA 3X2",
        title: "3x2 en Café de Especialidad & Croissants",
        subtitle: "Válido de Lunes a Viernes de 16:00 a 19:00 hs.",
        image: "assets/images/specialty_coffee.png",
        buttonText: "Ver Cafetería",
        targetCategory: "cafe_especialidad"
      },
      {
        id: "banner-cafe-02",
        enabled: true,
        type: "especial",
        badge: "BRUNCH SPECIAL",
        title: "Pancakes Dulces con Arándanos & Naranja",
        subtitle: "Pancakes esponjosos servidos con miel de azahar y crema batida.",
        image: "assets/images/berry_pancakes.png",
        buttonText: "Pedir Brunch",
        targetItem: "cafe-01"
      }
    ]
  }
};

export const MENU_ITEMS = [
  // ==========================================
  // PERFIL: RESTAURANTE (Gourmet Bistro & Grill)
  // ==========================================
  {
    id: "rest-01",
    businessProfile: "restaurant",
    category: "principales",
    name: "Salmón a la Manteca de Limón",
    price: 25000,
    formattedPrice: "$ 25.00",
    shortDescription: "Filete de salmón fresco a la plancha con salsa emulsionada de limón, espárragos verdes y hierbas aromáticas.",
    fullStory: "Preparado al momento con salmón fresco de pesca sustentable. Acompañado de espárragos tiernos salteados en oliva extra virgen y toque de pimienta rosa.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: true,
    prepTime: "20 min",
    rating: 4.8,
    dietaryFlags: {
      isGlutenFree: true,
      isVegan: false,
      isVegetarian: false,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/fresh_salmon.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: [
      {
        name: "Filete de Salmón Fresco",
        icon: "fish",
        description: "Corte magro rico en Omega-3, cocido a la perfección a fuego medio.",
        allergenWarning: "Contiene Pescado"
      },
      {
        name: "Manteca de Limón & Eneldo",
        icon: "butter",
        description: "Emulsión suave con jugo de limón fresco y hojas de eneldo silvestre.",
        allergenWarning: "Contiene Lácteos"
      }
    ]
  },
  {
    id: "rest-02",
    businessProfile: "restaurant",
    category: "principales",
    name: "Ojo de Bife Wagyu al Romero",
    price: 34000,
    formattedPrice: "$ 34.00",
    shortDescription: "Corte de res Wagyu 400g madurado 21 días, servido con patatas rústicas y manteca de ajo asado.",
    fullStory: "Selección especial con marmoleado superior. Sellado a la parrilla de quebracho blanco y finalizado con mantequilla botánica.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: true,
    hasVariations: true,
    variations: [
      { name: "300g Mediano", price: 28000 },
      { name: "400g Estándar", price: 34000 },
      { name: "600g XL Doble", price: 46000 }
    ],
    prepTime: "25 min",
    rating: 4.9,
    dietaryFlags: {
      isGlutenFree: true,
      isVegan: false,
      isVegetarian: false,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/herb_chicken.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: [
      {
        name: "Corte Wagyu Madurado",
        icon: "flame",
        description: "Carne tierna y jugosa con maduración en seco.",
        allergenWarning: null
      }
    ]
  },
  {
    id: "rest-03",
    businessProfile: "restaurant",
    category: "principales",
    name: "Tagliatelle Frescos al Tartufato",
    price: 24500,
    formattedPrice: "$ 24.50",
    shortDescription: "Pasta artesanal al huevo con crema ligera de trufa negra, queso parmesano añejado y microgreens.",
    fullStory: "Pastas amasadas diariamente con yemas de huevo orgánico de pastoreo y harina de sémola italiana.",
    isAvailable: true,
    isChefSpecial: false,
    isFeatured: true,
    prepTime: "15 min",
    rating: 4.9,
    dietaryFlags: {
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: true,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/truffle_pasta.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "rest-04",
    businessProfile: "restaurant",
    category: "entradas",
    name: "Burrata Pugliese con Higos & Jamón Serrano",
    price: 21000,
    formattedPrice: "$ 21.00",
    shortDescription: "Cremosa burrata fresca de 200g servida sobre colchón de rúcula silvestre, higos glaseados y reduccón de aceto.",
    fullStory: "Servida fría con pan de masa madre frotado en ajo y aceite de oliva virgen extra de primera extracción.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: true,
    prepTime: "10 min",
    rating: 4.9,
    dietaryFlags: {
      isGlutenFree: true,
      isVegan: false,
      isVegetarian: false,
      containsDairy: true,
      containsNuts: true
    },
    media: {
      heroImage: "assets/images/avocado_toast_egg.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "rest-05",
    businessProfile: "restaurant",
    category: "cocteleria",
    name: "Smoked Old Fashioned de Autor",
    price: 12000,
    formattedPrice: "$ 12.00",
    shortDescription: "Bourbon premium ahumado con astillas de roble, amargo de angostura y piel de naranja flameada.",
    fullStory: "Servido en vaso rocas sobre un cubo de hielo translúcido tallado a mano.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: false,
    prepTime: "5 min",
    rating: 5.0,
    dietaryFlags: {
      isGlutenFree: true,
      isVegan: true,
      isVegetarian: true,
      containsDairy: false,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/specialty_coffee.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "rest-06",
    businessProfile: "restaurant",
    category: "postres",
    name: "Volcán de Chocolate Belga con Helado",
    price: 14500,
    formattedPrice: "$ 14.50",
    shortDescription: "Bizcocho tibio de cacao 70% con centro fluido, acompañado de bocha de helado de vainilla fior di latte.",
    fullStory: "Horneado al momento durante 12 minutos exactos para lograr un contraste térmico inigualable.",
    isAvailable: true,
    isChefSpecial: false,
    isFeatured: true,
    prepTime: "12 min",
    rating: 4.8,
    dietaryFlags: {
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: true,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/matcha_cake.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },

  // ==========================================
  // PERFIL: CAFETERÍA (Maison Cafe & Bakery)
  // ==========================================
  {
    id: "cafe-01",
    businessProfile: "bakery_cafe",
    category: "pasteleria",
    name: "Pancakes Dulces con Arándanos & Naranja",
    price: 25000,
    formattedPrice: "$ 25.00",
    shortDescription: "Torre de pancakes esponjosos servidos con rodajas de naranja, arándanos frescos, miel pura y crema.",
    fullStory: "Preparados al momento a la plancha. Esponjosos por dentro con aroma natural de vainilla Bourbon.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: true,
    prepTime: "20 min",
    rating: 4.8,
    dietaryFlags: {
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: true,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/berry_pancakes.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "cafe-02",
    businessProfile: "bakery_cafe",
    category: "brunch",
    name: "Toast de Palta & Huevo Poché Orgánico",
    price: 22000,
    formattedPrice: "$ 22.00",
    shortDescription: "Pan de masa madre tostado, cremoso de aguacate Hass con semillas y huevo poché de granja.",
    fullStory: "Un clásico del brunch preparado con palta madurada en su punto justo.",
    isAvailable: true,
    isChefSpecial: false,
    isFeatured: true,
    prepTime: "10 min",
    rating: 4.7,
    dietaryFlags: {
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: true,
      containsDairy: false,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/avocado_toast_egg.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "cafe-03",
    businessProfile: "bakery_cafe",
    category: "pasteleria",
    name: "Tarta Opera de Matcha & Chocolate Blanco",
    price: 13000,
    formattedPrice: "$ 13.00",
    shortDescription: "Capas de bizcocho Joconde al té matcha de Uji, crema ligera de maracuyá y ganache de chocolate blanco.",
    fullStory: "Elaborada con té Matcha ceremonial de primera cosecha.",
    isAvailable: true,
    isChefSpecial: true,
    isFeatured: true,
    prepTime: "10 min",
    rating: 4.9,
    dietaryFlags: {
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: true,
      containsDairy: true,
      containsNuts: true
    },
    media: {
      heroImage: "assets/images/matcha_cake.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  },
  {
    id: "cafe-04",
    businessProfile: "bakery_cafe",
    category: "cafe_especialidad",
    name: "Café de Especialidad Latte Art",
    price: 6500,
    formattedPrice: "$ 6.50",
    shortDescription: "Espresso de grano 100% arábica de origen Colombia con leche emulsionada sedosa y arte latte.",
    fullStory: "Extracción doble a 9 bares de presión.",
    isAvailable: true,
    isChefSpecial: false,
    isFeatured: false,
    prepTime: "5 min",
    rating: 4.9,
    dietaryFlags: {
      isGlutenFree: true,
      isVegan: false,
      isVegetarian: true,
      containsDairy: true,
      containsNuts: false
    },
    media: {
      heroImage: "assets/images/specialty_coffee.png",
      videoLoopUrl: null,
      model3dUrl: null
    },
    layersOrIngredients: []
  }
];
