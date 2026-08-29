const { DEMO_OWNER, SEED_PRODUCTS } = require('./seedData');

// In-memory data store for standalone/serverless environments
const usersByUid = new Map();
const usersById = new Map();
const productsById = new Map();
const bookingsById = new Map();
const wishlistsByUid = new Map();
const reportsList = [];
const reviewsList = [];
const messagesByBookingId = new Map();

// Initialize Demo Owner
usersByUid.set(DEMO_OWNER.firebaseUid, { ...DEMO_OWNER });
usersById.set(DEMO_OWNER._id, { ...DEMO_OWNER });

// Initialize 12 Products
SEED_PRODUCTS.forEach((prod) => {
  const item = {
    ...prod,
    owner: { ...DEMO_OWNER },
    createdAt: new Date('2026-08-25T10:00:00.000Z'),
    updatedAt: new Date('2026-08-25T10:00:00.000Z'),
  };
  productsById.set(prod._id, item);
});

// User Methods
const getUserByUid = (firebaseUid) => {
  if (!firebaseUid) return null;
  return usersByUid.get(firebaseUid) || null;
};

const getUserById = (id) => {
  if (!id) return null;
  const idStr = id._id ? id._id.toString() : (id.toString ? id.toString() : String(id));
  return usersById.get(idStr) || null;
};

const saveUser = (userDoc) => {
  if (!userDoc) return null;
  if (!userDoc._id) {
    userDoc._id = 'user_' + Math.random().toString(36).substring(2, 12);
  }
  usersByUid.set(userDoc.firebaseUid, userDoc);
  usersById.set(userDoc._id.toString(), userDoc);
  return userDoc;
};

const getOrCreateUserByUid = (firebaseUid, extra = {}) => {
  let user = getUserByUid(firebaseUid);
  if (!user) {
    const _id = 'user_' + Math.random().toString(36).substring(2, 12);
    user = {
      _id,
      firebaseUid,
      displayName: extra.displayName || extra.name || 'Grabit User',
      email: extra.email || `${firebaseUid.substring(0, 8)}@grabit.com`,
      phoneNumber: extra.phoneNumber || '',
      avatarUrl: extra.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      verification: { status: 'unverified' },
      rating: { average: 5.0, count: 1 },
      notificationPrefs: { bookingUpdates: true, chatMessages: true },
      referralCode: `GRAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      referredBy: null,
      createdAt: new Date(),
    };
    saveUser(user);
  }
  return user;
};

// Product Methods
const getProductById = (id) => {
  if (!id) return null;
  const idStr = id._id ? id._id.toString() : (id.toString ? id.toString() : String(id));
  return productsById.get(idStr) || null;
};

const getAllProducts = () => {
  return Array.from(productsById.values());
};

const saveProduct = (prod) => {
  if (!prod._id) {
    prod._id = 'prod_' + Math.random().toString(36).substring(2, 12);
  }
  productsById.set(prod._id.toString(), prod);
  return prod;
};

// Booking Methods
const createBooking = (bookingData) => {
  const _id = '66d0a' + Math.random().toString(16).substring(2, 10) + 'c901' + Math.random().toString(16).substring(2, 6);
  const booking = {
    _id,
    ...bookingData,
    status: bookingData.status || 'confirmed',
    paymentStatus: bookingData.paymentStatus || 'unpaid',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  bookingsById.set(_id, booking);
  return booking;
};

const getBookingById = (id) => {
  if (!id) return null;
  const idStr = id._id ? id._id.toString() : (id.toString ? id.toString() : String(id));
  return bookingsById.get(idStr) || null;
};

const updateBooking = (id, updates) => {
  const existing = getBookingById(id);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };
  bookingsById.set(existing._id, updated);
  return updated;
};

const getBookingsForUser = (userId) => {
  const idStr = userId._id ? userId._id.toString() : (userId.toString ? userId.toString() : String(userId));
  const all = Array.from(bookingsById.values());
  const asRenter = all.filter((b) => {
    const renterId = b.renter ? (b.renter._id ? b.renter._id.toString() : b.renter.toString()) : '';
    return renterId === idStr;
  });
  const asOwner = all.filter((b) => {
    const ownerId = b.owner ? (b.owner._id ? b.owner._id.toString() : b.owner.toString()) : '';
    return ownerId === idStr;
  });
  return { asRenter, asOwner, all: [...asRenter, ...asOwner] };
};

// Wishlist Methods
const getWishlist = (firebaseUid) => {
  const set = wishlistsByUid.get(firebaseUid);
  if (!set) return [];
  return Array.from(set).map((id) => getProductById(id)).filter(Boolean);
};

const addToWishlist = (firebaseUid, productId) => {
  if (!wishlistsByUid.has(firebaseUid)) {
    wishlistsByUid.set(firebaseUid, new Set());
  }
  wishlistsByUid.get(firebaseUid).add(productId.toString());
  return getWishlist(firebaseUid);
};

const removeFromWishlist = (firebaseUid, productId) => {
  if (wishlistsByUid.has(firebaseUid)) {
    wishlistsByUid.get(firebaseUid).delete(productId.toString());
  }
  return getWishlist(firebaseUid);
};

module.exports = {
  getUserByUid,
  getUserById,
  saveUser,
  getOrCreateUserByUid,
  getProductById,
  getAllProducts,
  saveProduct,
  createBooking,
  getBookingById,
  updateBooking,
  getBookingsForUser,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  reportsList,
  reviewsList,
  messagesByBookingId,
};
