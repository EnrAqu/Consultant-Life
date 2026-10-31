// Career outfits (ITERATION_2 §3). Pure data: colours and accessories read by TextureFactory.
export const OUTFITS = {
  junior: {
    title: 'Junior Analyst',
    skin: 0xf1c27d, hair: 0x3f2a1d, messyHair: true,
    top: 0x6b7280, topDark: 0x4b5563, sleeves: 'long', hood: true,
    pants: 0x1e40af, legs: 'long', shoes: 0xf8fafc,
    headphones: true, backpack: 0x1f2937,
  },
  consultant: {
    title: 'Consultant',
    skin: 0xf1c27d, hair: 0x3f2a1d,
    top: 0x93c5fd, topDark: 0x60a5fa, sleeves: 'rolled',
    pants: 0xd6c7a1, legs: 'long', shoes: 0x78350f,
    badge: true,
  },
  manager: {
    title: 'Manager',
    skin: 0xf1c27d, hair: 0x3f2a1d,
    top: 0x1e3a8a, topDark: 0x172554, sleeves: 'long', shirtV: 0xffffff,
    pants: 0x374151, legs: 'long', shoes: 0x78350f,
  },
  seniorManager: {
    title: 'Senior Manager',
    skin: 0xf1c27d, hair: 0x27272a,
    top: 0x374151, topDark: 0x1f2937, sleeves: 'long', shirtV: 0xffffff, tie: 0xdc2626, pocketSquare: true,
    pants: 0x374151, legs: 'long', shoes: 0x111827,
  },
  partner: {
    title: 'Partner',
    skin: 0xe8b07a, hair: 0x9ca3af,
    top: 0xf9a8d4, topDark: 0xf472b6, sleeves: 'short', sweaterOnShoulders: 0x7dd3fc,
    pants: 0xe7d7b5, legs: 'shorts', shoes: 0x92400e,
    sunglasses: true,
  },
  farmer: {
    title: 'Contadino',
    skin: 0xe8b07a, hair: 0x3f2a1d,
    top: 0xdc2626, topDark: 0x991b1b, sleeves: 'rolled', plaid: true,
    pants: 0x2563eb, legs: 'long', shoes: 0x78350f,
    overalls: 0x2563eb, strawHat: true,
  },
};

export const OUTFIT_IDS = Object.keys(OUTFITS);

// Animation frames generated for every outfit, in sheet order.
export const PLAYER_FRAMES = ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'freeze'];
export const PLAYER_FRAME_W = 32;
export const PLAYER_FRAME_H = 40;
