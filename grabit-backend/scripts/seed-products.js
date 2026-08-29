require('dotenv').config();
const mongoose = require('mongoose');
const { Product, User } = require('../src/models');
const { DEMO_OWNER, SEED_PRODUCTS } = require('../src/data/seedData');

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
