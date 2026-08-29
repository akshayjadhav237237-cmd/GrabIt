require('dotenv').config();
const mongoose = require('mongoose');
const { Product, User } = require('../src/models');

const DEMO_OWNER = {
  firebaseUid: 'demo-owner-123',
  email: 'owner@grabit.com',
  displayName: 'Arjun Sharma',
  phoneNumber: '+919876543210',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  verification: {
    status: 'verified',
    verifiedAt: new Date('2026-01-15T10:00:00.000Z'),
  },
  rating: {
    average: 4.9,
    count: 28,
  },
};

const SEED_PRODUCTS = [
  // 1. Cameras
  {
    title: 'Canon EOS R10 Mirrorless Camera with 18-45mm Lens',
    description:
      'Compact and lightweight 24.2 MP APS-C mirrorless camera featuring DIGIC X image processor, 4K60p video recording, and Dual Pixel CMOS AF II with subject detection. Includes RF-S 18-45mm IS STM lens, two rechargeable batteries, 64GB high-speed SD card, and padded protective carry bag. Perfect for travel photography, vlogging, and content creation.',
    category: 'Cameras',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 850,
      perWeek: 5100,
      securityDeposit: 24000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 150,
    },
    location: {
      address: 'Indiranagar, 100 Feet Road',
      city: 'Bengaluru',
      coordinates: [77.6412, 12.9716],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'Sony Alpha A7 IV Full-Frame Camera Body',
    description:
      'Flagship 33MP full-frame Exmor R CMOS sensor with BIONZ XR processing engine, 4K 60p 10-bit 4:2:2 video capture, real-time eye autofocus for human/animal/bird, and 5-axis optical in-body image stabilization. Includes two Sony NP-FZ100 batteries, dual battery charger, strap, and Pelican hard case.',
    category: 'Cameras',
    images: [
      'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1606978434861-689b25a3ea23?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 2200,
      perWeek: 13200,
      securityDeposit: 65000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 300,
    },
    location: {
      address: 'Bandra West, Hill Road',
      city: 'Mumbai',
      coordinates: [72.8362, 19.0596],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },

  // 2. Drones
  {
    title: 'DJI Mini 4 Pro Fly More Combo Drone',
    description:
      'Ultra-compact sub-249g folding drone equipped with omnidirectional obstacle sensing, 4K/60fps HDR true vertical shooting, 20km FHD video transmission, and ActiveTrack 360°. Includes DJI RC 2 remote with built-in screen, 3 Intelligent Flight Batteries, two-way charging hub, spare propellers, ND filter set, and shoulder bag.',
    category: 'Drones',
    images: [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 1100,
      perWeek: 6600,
      securityDeposit: 30000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 200,
    },
    location: {
      address: 'Koramangala 4th Block',
      city: 'Bengaluru',
      coordinates: [77.6245, 12.9352],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'DJI Air 3 Dual-Camera Drone with RC 2',
    description:
      'Dual primary camera drone featuring 1/1.3-inch CMOS wide-angle and 3x medium telephoto cameras, 46-minute maximum flight time, omnidirectional obstacle detection, and O4 HD video transmission. Delivered with DJI RC 2 controller, 3 batteries, multi-charger, Freewell ND filter kit, and rugged case.',
    category: 'Drones',
    images: [
      'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 1650,
      perWeek: 9900,
      securityDeposit: 45000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 250,
    },
    location: {
      address: 'Cyber City, DLF Phase 2, Gurugram',
      city: 'Delhi NCR',
      coordinates: [77.0878, 28.4906],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },

  // 3. Power Tools
  {
    title: 'DeWalt 20V MAX Cordless Drill & Impact Driver Combo',
    description:
      'High-performance brushless combo kit including 1/2-inch drill/driver (compact and lightweight with 2-speed transmission) and 1/4-inch impact driver producing 1,500 in-lbs of torque. Includes two 20V MAX 2.0Ah lithium-ion batteries, fast charger, 30-piece drill and drive bit accessory set, and heavy-duty contractor bag.',
    category: 'Power Tools',
    images: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 350,
      perWeek: 2100,
      securityDeposit: 7500,
    },
    damageProtection: {
      isAvailable: true,
      fee: 60,
    },
    location: {
      address: 'Madhapur, Hitech City',
      city: 'Hyderabad',
      coordinates: [78.3869, 17.4483],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'Bosch Professional GBH 2-26 DRE Rotary Hammer',
    description:
      'Heavy-duty 800W corded rotary hammer delivering 2.7 Joules of impact energy for fast drilling and chiseling in concrete, brick, masonry, and steel. Equipped with SDS-plus chuck, rotating brush plate for equal forward/reverse power, overload clutch, depth stop, auxiliary handle, and hard carrying case with SDS drill bit set.',
    category: 'Power Tools',
    images: [
      'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 220,
      perWeek: 1320,
      securityDeposit: 4500,
    },
    damageProtection: {
      isAvailable: true,
      fee: 50,
    },
    location: {
      address: 'Kothrud, Paud Road',
      city: 'Pune',
      coordinates: [73.8153, 18.5074],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },

  // 4. Event Equipment
  {
    title: 'JBL PartyBox 310 Portable Bluetooth Party Speaker',
    description:
      'Massive 240-watt peak output portable party speaker featuring JBL Pro Sound, dynamic synchronized RGB light show, 18-hour battery life, and smooth-glide wheels with telescopic handle. Includes dual microphone inputs, instrument input, Bluetooth 5.1, and splashproof IPX4 protection. Ideal for outdoor parties, weddings, and backyard movie nights.',
    category: 'Event Equipment',
    images: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 550,
      perWeek: 3300,
      securityDeposit: 12000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 100,
    },
    location: {
      address: 'Andheri West, Lokhandwala',
      city: 'Mumbai',
      coordinates: [72.8277, 19.1417],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'Shure SM7B Dynamic Vocal Mic with Cloudlifter & Stand',
    description:
      'Legendary studio dynamic vocal microphone featuring flat, wide-range frequency response for exceptionally clean and natural reproduction of voice and music. Includes Cloud Microphones Cloudlifter CL-1 mic activator (+25dB clean gain), Mogami Gold XLR cable, K&M heavy-duty boom stand, and A7WS detachable windscreen.',
    category: 'Event Equipment',
    images: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520523839898-5071282543e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 650,
      perWeek: 3900,
      securityDeposit: 16000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 100,
    },
    location: {
      address: 'HSR Layout, Sector 3',
      city: 'Bengaluru',
      coordinates: [77.6387, 12.9121],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },

  // 5. Electronics
  {
    title: 'Apple MacBook Pro 16-inch M3 Pro (36GB RAM, 512GB)',
    description:
      'Apple M3 Pro chip with 12-core CPU, 18-core GPU, 36GB unified memory, and 512GB blazing-fast SSD storage. Features 16.2-inch Liquid Retina XDR display with ProMotion 120Hz, studio-quality three-mic array, six-speaker sound system with Spatial Audio, 140W USB-C Power Adapter, and MagSafe 3 cable in Space Black. Perfect for 4K video editing, 3D rendering, and software development.',
    category: 'Electronics',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 2400,
      perWeek: 14400,
      securityDeposit: 75000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 350,
    },
    location: {
      address: 'Whitefield, ITPL Main Road',
      city: 'Bengaluru',
      coordinates: [77.7499, 12.9698],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    description:
      'Industry-leading noise canceling headphones powered by two processors and 8 microphones for unparalleled noise reduction. Features Auto NC Optimizer, 30-hour battery life with quick charging (3 min charge for 3 hours playback), crystal clear hands-free calling with 4 beamforming mics, multipoint connection, and premium collapsible travel case.',
    category: 'Electronics',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 380,
      perWeek: 2280,
      securityDeposit: 9500,
    },
    damageProtection: {
      isAvailable: true,
      fee: 60,
    },
    location: {
      address: 'T. Nagar, Usman Road',
      city: 'Chennai',
      coordinates: [80.2337, 13.0418],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },

  // 6. Other
  {
    title: 'Osprey Atmos AG 65L Expedition Trekking Backpack',
    description:
      'Premium technical trekking backpack equipped with Anti-Gravity 3D suspended mesh suspension system and Fit-on-the-Fly custom adjustable hipbelt and harness. Features 65-liter capacity, floating top lid with dual zippered pockets, integrated removable raincover, trekking pole attachment, and internal hydration sleeve. Size: Medium/Large (Mythic Blue).',
    category: 'Other',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 280,
      perWeek: 1680,
      securityDeposit: 7000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 50,
    },
    location: {
      address: 'Jayanagar 4th Block',
      city: 'Bengaluru',
      coordinates: [77.5838, 12.925],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
  {
    title: 'Yeti Tundra 45 Premium Outdoor Hard Cooler',
    description:
      'Legendary indestructible rotomolded heavy-duty cooler featuring up to 3 inches of PermaFrost insulation and ColdLock gasket for days of ice retention. Holds up to 28 cans with a 2:1 ice-to-contents ratio or 34 pounds of ice. Equipped with T-Rex lid latches, NeverFail hinge system, DoubleHaul military-grade polyester rope handles, and dry goods basket.',
    category: 'Other',
    images: [
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80',
    ],
    rentalPrice: {
      perDay: 420,
      perWeek: 2520,
      securityDeposit: 11000,
    },
    damageProtection: {
      isAvailable: true,
      fee: 60,
    },
    location: {
      address: 'Viman Nagar, Phoenix Marketcity Road',
      city: 'Pune',
      coordinates: [73.9143, 18.5679],
    },
    availability: {
      isAvailable: true,
      blackoutDates: [],
    },
  },
];

async function seedDatabase() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grabit';
  console.log(`[Seed Script] Connecting to MongoDB: ${mongoURI}`);

  try {
    await mongoose.connect(mongoURI);
    console.log('[Seed Script] MongoDB connected successfully.');

    // 1. Ensure Demo Owner exists
    let owner = await User.findOne({ firebaseUid: DEMO_OWNER.firebaseUid });
    if (!owner) {
      owner = await User.create(DEMO_OWNER);
      console.log(`[Seed Script] Created demo owner account: ${owner.displayName} (${owner.email})`);
    } else {
      owner.displayName = DEMO_OWNER.displayName;
      owner.email = DEMO_OWNER.email;
      owner.phoneNumber = DEMO_OWNER.phoneNumber;
      owner.avatarUrl = DEMO_OWNER.avatarUrl;
      owner.verification = DEMO_OWNER.verification;
      owner.rating = DEMO_OWNER.rating;
      await owner.save();
      console.log(`[Seed Script] Updated demo owner account: ${owner.displayName} (${owner.email})`);
    }

    // 2. Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`[Seed Script] Cleared existing products. Deleted count: ${deleteResult.deletedCount}`);

    // 3. Insert 12 seed products
    const productsToInsert = SEED_PRODUCTS.map((prod) => ({
      ...prod,
      owner: owner._id,
    }));

    const inserted = await Product.insertMany(productsToInsert);
    console.log(`[Seed Script] Successfully seeded ${inserted.length} high-quality products into MongoDB:\n`);

    inserted.forEach((prod, index) => {
      console.log(
        `  ${index + 1}. [${prod.category}] "${prod.title}" - ₹${prod.rentalPrice.perDay}/day | Deposit: ₹${prod.rentalPrice.securityDeposit} | Damage Fee: ₹${prod.damageProtection.fee} | ${prod.location.city}`
      );
    });

    console.log('\n[Seed Script] Database seed completed successfully!');
    return { success: true, count: inserted.length };
  } catch (error) {
    console.error('[Seed Script] Seeding error:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Seed Script] Disconnected from MongoDB.');
    }
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, DEMO_OWNER, SEED_PRODUCTS };
