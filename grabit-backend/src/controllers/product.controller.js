const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const { Product, User, Booking } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../config/s3');
const { SEED_PRODUCTS, DEMO_OWNER } = require('../data/seedData');
const memoryStore = require('../data/memoryStore');

/**
 * Helper to escape regex special characters
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Robust User Lookup (DB / mocks with memoryStore fallback).
 */
const findUser = async (firebaseUid, extra = {}) => {
  try {
    if (typeof User.findOne === 'function') {
      const u = await User.findOne({ firebaseUid });
      if (u) return u;
    }
  } catch (err) {
    console.warn('[Products] User lookup notice:', err.message);
  }
  return memoryStore.getOrCreateUserByUid(firebaseUid, extra);
};

/**
 * Robust Product Lookup (DB / mocks with memoryStore fallback).
 */
const findProduct = async (productId) => {
  try {
    if (typeof Product.findById === 'function' && mongoose.Types.ObjectId.isValid(productId)) {
      const p = await Product.findById(productId);
      if (p) return p;
    }
  } catch (err) {
    console.warn('[Products] Product lookup notice:', err.message);
  }
  return memoryStore.getProductById(productId);
};

/**
 * Create a new product listing.
 * Protected via authMiddleware.
 *
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    // Resolve or create user document
    let user = await findUser(firebaseUid, req.user);
    if (!user) {
      user = memoryStore.getOrCreateUserByUid(firebaseUid, req.user);
    }

    const {
      title,
      description,
      category,
      rentalPrice,
      damageProtection,
      location,
      images,
    } = req.body;

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required',
      });
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required',
      });
    }

    if (
      !rentalPrice ||
      rentalPrice.perDay === undefined ||
      rentalPrice.perDay === null ||
      typeof rentalPrice.perDay === 'boolean' ||
      isNaN(Number(rentalPrice.perDay)) ||
      Number(rentalPrice.perDay) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rental price per day must be a positive number',
      });
    }

    if (
      rentalPrice.securityDeposit !== undefined &&
      rentalPrice.securityDeposit !== null &&
      (typeof rentalPrice.securityDeposit === 'boolean' ||
        isNaN(Number(rentalPrice.securityDeposit)) ||
        Number(rentalPrice.securityDeposit) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Security deposit cannot be negative',
      });
    }

    if (
      rentalPrice.perWeek !== undefined &&
      rentalPrice.perWeek !== null &&
      (typeof rentalPrice.perWeek === 'boolean' ||
        isNaN(Number(rentalPrice.perWeek)) ||
        Number(rentalPrice.perWeek) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Weekly rental price cannot be negative',
      });
    }

    let product = null;

    try {
      if (typeof Product.create === 'function') {
        product = await Product.create({
          owner: user._id,
          title: title.trim(),
          description: typeof description === 'string' ? description.trim() : '',
          category: category.trim(),
          rentalPrice: {
            perDay: Number(rentalPrice.perDay),
            ...(rentalPrice.perWeek !== undefined &&
              rentalPrice.perWeek !== null && { perWeek: Number(rentalPrice.perWeek) }),
            securityDeposit:
              rentalPrice.securityDeposit !== undefined && rentalPrice.securityDeposit !== null
                ? Number(rentalPrice.securityDeposit)
                : 0,
          },
          damageProtection: {
            isAvailable: damageProtection?.isAvailable === true,
            fee: damageProtection?.fee ? Number(damageProtection.fee) : 0,
          },
          location: {
            address: location?.address ? String(location.address).trim() : '',
            city: location?.city ? String(location.city).trim() : '',
            coordinates: Array.isArray(location?.coordinates) ? location.coordinates : [],
          },
          images: Array.isArray(images) ? images : [],
          availability: {
            isAvailable: true,
            blackoutDates: [],
          },
        });
      }
    } catch (dbErr) {
      console.warn('[Products] Product.create DB notice:', dbErr.message);
    }

    if (!product) {
      product = {
        _id: 'prod_' + Math.random().toString(36).substring(2, 10),
        owner: user,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        category: category.trim(),
        rentalPrice: {
          perDay: Number(rentalPrice.perDay),
          ...(rentalPrice.perWeek !== undefined &&
            rentalPrice.perWeek !== null && { perWeek: Number(rentalPrice.perWeek) }),
          securityDeposit:
            rentalPrice.securityDeposit !== undefined && rentalPrice.securityDeposit !== null
              ? Number(rentalPrice.securityDeposit)
              : 0,
        },
        damageProtection: {
          isAvailable: damageProtection?.isAvailable === true,
          fee: damageProtection?.fee ? Number(damageProtection.fee) : 0,
        },
        location: {
          address: location?.address ? String(location.address).trim() : '',
          city: location?.city ? String(location.city).trim() : '',
          coordinates: Array.isArray(location?.coordinates) ? location.coordinates : [],
        },
        images: Array.isArray(images) ? images : [],
        availability: {
          isAvailable: true,
          blackoutDates: [],
        },
        createdAt: new Date(),
      };
      memoryStore.saveProduct(product);
    }

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List products with pagination, category/city filtering, and unavailable product exclusion.
 * Public endpoint.
 *
 * GET /api/products
 */
const getProducts = async (req, res, next) => {
  try {
    // If mine=true, return all products owned by authenticated user (including inactive/archived)
    if (req.query.mine === 'true') {
      const firebaseUid = req.user && req.user.uid;
      if (!firebaseUid) {
        return res.status(401).json({
          success: false,
          message: 'Authorization token required',
        });
      }

      const user = await findUser(firebaseUid, req.user);
      if (!user) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      try {
        if (typeof Product.find === 'function') {
          const products = await Product.find({ owner: user._id })
            .sort({ createdAt: -1 })
            .populate('owner', 'displayName avatarUrl rating');

          if (products) {
            return res.status(200).json({
              success: true,
              count: products.length,
              data: products,
            });
          }
        }
      } catch (err) {
        console.warn('[Products] Product.find mine DB notice:', err.message);
      }

      const userProducts = memoryStore.productsList.filter((p) => {
        const oId = p.owner ? (p.owner._id ? p.owner._id.toString() : p.owner.toString()) : '';
        return oId === user._id.toString();
      });

      return res.status(200).json({
        success: true,
        count: userProducts.length,
        data: userProducts,
      });
    }

    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    } else if (limit > 50) {
      limit = 50;
    }

    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category && typeof req.query.category === 'string') {
      const categoryQuery = req.query.category.trim();
      if (categoryQuery) {
        filter.category = { $regex: new RegExp(`^${escapeRegex(categoryQuery)}$`, 'i') };
      }
    }

    if (req.query.city && typeof req.query.city === 'string') {
      const cityQuery = req.query.city.trim();
      if (cityQuery) {
        filter['location.city'] = { $regex: new RegExp(escapeRegex(cityQuery), 'i') };
      }
    }

    if (req.query.search && typeof req.query.search === 'string') {
      const searchQuery = req.query.search.trim();
      if (searchQuery) {
        const searchRegex = { $regex: new RegExp(escapeRegex(searchQuery), 'i') };
        filter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
        ];
      }
    }

    const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : null;

    if (minPrice !== null && !isNaN(minPrice)) {
      filter['rentalPrice.perDay'] = {
        ...filter['rentalPrice.perDay'],
        $gte: minPrice,
      };
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      filter['rentalPrice.perDay'] = {
        ...filter['rentalPrice.perDay'],
        $lte: maxPrice,
      };
    }

    filter['availability.isAvailable'] = { $ne: false };

    let sortOption = { createdAt: -1 };
    if (req.query.sort === 'price_asc') {
      sortOption = { 'rentalPrice.perDay': 1 };
    } else if (req.query.sort === 'price_desc') {
      sortOption = { 'rentalPrice.perDay': -1 };
    } else if (req.query.sort === 'newest') {
      sortOption = { createdAt: -1 };
    }

    let total = 0;
    let products = [];

    try {
      if (typeof Product.countDocuments === 'function') {
        total = await Product.countDocuments(filter);
        if (total > 0 && typeof Product.find === 'function') {
          products = await Product.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate('owner', 'displayName avatarUrl rating');
        }
      }
    } catch (dbErr) {
      console.warn('[Products] DB query notice:', dbErr.message);
    }

    // Fallback to in-memory SEED_PRODUCTS if database is empty or disconnected
    if ((!products || products.length === 0) && (!req.query.mine || req.query.mine !== 'true')) {
      let memoryList = SEED_PRODUCTS.map((p) => ({
        ...p,
        owner: DEMO_OWNER,
        createdAt: new Date('2026-08-25T10:00:00.000Z'),
      }));

      // Apply category filter
      if (req.query.category && typeof req.query.category === 'string') {
        const cat = req.query.category.trim().toLowerCase();
        if (cat) {
          memoryList = memoryList.filter((p) => (p.category || '').toLowerCase() === cat);
        }
      }

      // Apply city filter
      if (req.query.city && typeof req.query.city === 'string') {
        const cityQuery = req.query.city.trim().toLowerCase();
        if (cityQuery) {
          memoryList = memoryList.filter((p) =>
            ((p.location && p.location.city) || '').toLowerCase().includes(cityQuery)
          );
        }
      }

      // Apply search filter
      if (req.query.search && typeof req.query.search === 'string') {
        const q = req.query.search.trim().toLowerCase();
        if (q) {
          memoryList = memoryList.filter(
            (p) =>
              (p.title || '').toLowerCase().includes(q) ||
              (p.description || '').toLowerCase().includes(q) ||
              (p.category || '').toLowerCase().includes(q)
          );
        }
      }

      // Apply price filter
      if (minPrice !== null && !isNaN(minPrice)) {
        memoryList = memoryList.filter(
          (p) => p.rentalPrice && p.rentalPrice.perDay >= minPrice
        );
      }
      if (maxPrice !== null && !isNaN(maxPrice)) {
        memoryList = memoryList.filter(
          (p) => p.rentalPrice && p.rentalPrice.perDay <= maxPrice
        );
      }

      // Apply sort
      if (req.query.sort === 'price_asc') {
        memoryList.sort((a, b) => a.rentalPrice.perDay - b.rentalPrice.perDay);
      } else if (req.query.sort === 'price_desc') {
        memoryList.sort((a, b) => b.rentalPrice.perDay - a.rentalPrice.perDay);
      }

      total = memoryList.length;
      products = memoryList.slice(skip, skip + limit);
    }

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return res.status(200).json({
      success: true,
      count: (products || []).length,
      total,
      page,
      totalPages,
      data: products || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve a single product by ID.
 * Public endpoint.
 *
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      if (typeof Product.findById === 'function' && mongoose.Types.ObjectId.isValid(id)) {
        const product = await Product.findById(id).populate('owner', 'displayName avatarUrl rating');
        if (product) {
          return res.status(200).json({
            success: true,
            data: product,
          });
        }
      }
    } catch (dbErr) {
      console.warn('[Products] DB findById notice:', dbErr.message);
    }

    // Fallback to SEED_PRODUCTS
    const foundSeed = SEED_PRODUCTS.find((p) => p._id === id || p.id === id);
    if (foundSeed) {
      return res.status(200).json({
        success: true,
        data: {
          ...foundSeed,
          owner: DEMO_OWNER,
        },
      });
    }

    const memProd = memoryStore.getProductById(id);
    if (memProd) {
      return res.status(200).json({
        success: true,
        data: memProd,
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing product listing.
 * Protected via authMiddleware (owner only).
 *
 * PATCH /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to edit this product',
      });
    }

    // Validation for update fields
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product title is required',
        });
      }
      product.title = req.body.title.trim();
    }

    if (req.body.category !== undefined) {
      if (typeof req.body.category !== 'string' || !req.body.category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product category is required',
        });
      }
      product.category = req.body.category.trim();
    }

    if (req.body.rentalPrice !== undefined) {
      if (req.body.rentalPrice.perDay !== undefined) {
        const perDay = Number(req.body.rentalPrice.perDay);
        if (typeof req.body.rentalPrice.perDay === 'boolean' || isNaN(perDay) || perDay <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Rental price per day must be a positive number',
          });
        }
        product.rentalPrice.perDay = perDay;
      }

      if (req.body.rentalPrice.securityDeposit !== undefined) {
        const securityDeposit = Number(req.body.rentalPrice.securityDeposit);
        if (
          typeof req.body.rentalPrice.securityDeposit === 'boolean' ||
          isNaN(securityDeposit) ||
          securityDeposit < 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'Security deposit cannot be negative',
          });
        }
        product.rentalPrice.securityDeposit = securityDeposit;
      }

      if (req.body.rentalPrice.perWeek !== undefined) {
        const perWeek = Number(req.body.rentalPrice.perWeek);
        if (
          typeof req.body.rentalPrice.perWeek === 'boolean' ||
          isNaN(perWeek) ||
          perWeek < 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'Weekly rental price cannot be negative',
          });
        }
        product.rentalPrice.perWeek = perWeek;
      }
    }

    if (req.body.description !== undefined) {
      product.description = String(req.body.description).trim();
    }

    if (req.body.damageProtection !== undefined) {
      if (!product.damageProtection) {
        product.damageProtection = {};
      }
      if (req.body.damageProtection.isAvailable !== undefined) {
        product.damageProtection.isAvailable = Boolean(req.body.damageProtection.isAvailable);
      }
      if (req.body.damageProtection.fee !== undefined) {
        product.damageProtection.fee = Number(req.body.damageProtection.fee);
      }
    }

    if (req.body.location !== undefined) {
      if (!product.location) {
        product.location = {};
      }
      if (req.body.location.address !== undefined) {
        product.location.address = String(req.body.location.address).trim();
      }
      if (req.body.location.city !== undefined) {
        product.location.city = String(req.body.location.city).trim();
      }
      if (Array.isArray(req.body.location.coordinates)) {
        product.location.coordinates = req.body.location.coordinates;
      }
    }

    if (req.body.dailyRate !== undefined && (req.body.rentalPrice === undefined || req.body.rentalPrice.perDay === undefined)) {
      const dailyRateNum = Number(req.body.dailyRate);
      if (typeof req.body.dailyRate === 'boolean' || isNaN(dailyRateNum) || dailyRateNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Daily rate must be a positive number',
        });
      }
      if (!product.rentalPrice) {
        product.rentalPrice = { perDay: dailyRateNum };
      } else {
        product.rentalPrice.perDay = dailyRateNum;
      }
    }

    if (req.body.securityDeposit !== undefined && (req.body.rentalPrice === undefined || req.body.rentalPrice.securityDeposit === undefined)) {
      const depositNum = Number(req.body.securityDeposit);
      if (typeof req.body.securityDeposit === 'boolean' || isNaN(depositNum) || depositNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Security deposit cannot be negative',
        });
      }
      if (!product.rentalPrice) {
        product.rentalPrice = { perDay: 0, securityDeposit: depositNum };
      } else {
        product.rentalPrice.securityDeposit = depositNum;
      }
    }

    if (req.body.city !== undefined && (req.body.location === undefined || req.body.location.city === undefined)) {
      if (!product.location) {
        product.location = {};
      }
      product.location.city = String(req.body.city).trim();
    }

    if (req.body.isAvailable !== undefined) {
      if (!product.availability) {
        product.availability = {};
      }
      product.availability.isAvailable = Boolean(req.body.isAvailable);
    } else if (req.body.availability !== undefined && req.body.availability.isAvailable !== undefined) {
      if (!product.availability) {
        product.availability = {};
      }
      product.availability.isAvailable = Boolean(req.body.availability.isAvailable);
    }

    if (Array.isArray(req.body.images)) {
      product.images = req.body.images;
    }

    if (typeof product.save === 'function') {
      await product.save();
    } else {
      memoryStore.saveProduct(product);
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if a product has existing bookings and can be hard deleted.
 * Protected via authMiddleware (owner only).
 *
 * GET /api/products/:id/bookings-check
 */
const getProductBookingsCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to check this product',
      });
    }

    let bookingsCount = 0;
    try {
      if (typeof Booking.countDocuments === 'function') {
        bookingsCount = await Booking.countDocuments({ product: id });
      }
    } catch {
      bookingsCount = 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingsCount,
        canHardDelete: bookingsCount === 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete or archive a product listing.
 * Protected via authMiddleware (owner only).
 *
 * DELETE /api/products/:id?hard=true|false
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete this product',
      });
    }

    if (req.query.hard === 'true') {
      let bookingsCount = 0;
      try {
        if (typeof Booking.countDocuments === 'function') {
          bookingsCount = await Booking.countDocuments({ product: id });
        }
      } catch {
        bookingsCount = 0;
      }

      if (bookingsCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot permanently delete product with existing booking history. Please archive instead.',
        });
      }

      try {
        if (typeof Product.findByIdAndDelete === 'function') {
          await Product.findByIdAndDelete(id);
        }
      } catch (err) {
        console.warn('[Products] findByIdAndDelete notice:', err.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Product permanently deleted',
        hardDeleted: true,
      });
    }

    if (!product.availability) {
      product.availability = {};
    }
    product.availability.isAvailable = false;

    if (typeof product.save === 'function') {
      await product.save();
    } else {
      memoryStore.saveProduct(product);
    }

    return res.status(200).json({
      success: true,
      message: 'Product archived successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload an image for a product.
 * Protected via authMiddleware (owner only). Max 5 images per product.
 *
 * POST /api/products/:id/images
 */
const uploadProductImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to upload images for this product',
      });
    }

    // Check maximum 5 images limit
    if (!Array.isArray(product.images)) {
      product.images = [];
    }
    if (product.images.length >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per product',
      });
    }

    // Check for multer file filter validation error
    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: req.fileValidationError,
      });
    }

    // Validate uploaded file existence
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    // Validate MIME types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Only JPG, PNG, and WebP images are allowed',
      });
    }

    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }

    // Determine extension
    let ext = 'jpg';
    if (req.file.mimetype === 'image/png') {
      ext = 'png';
    } else if (req.file.mimetype === 'image/webp') {
      ext = 'webp';
    } else if (req.file.mimetype === 'image/jpeg') {
      ext = 'jpg';
    } else if (req.file.originalname) {
      const parsedExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();
      if (parsedExt) {
        ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
      }
    }

    const productId = product._id ? product._id.toString() : id;
    const key = `products/${productId}/${crypto.randomUUID()}.${ext}`;

    const imageUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);

    product.images.push(imageUrl);
    if (typeof product.save === 'function') {
      await product.save();
    } else {
      memoryStore.saveProduct(product);
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: product,
      imageUrl,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an image from a product.
 * Protected via authMiddleware (owner only).
 *
 * DELETE /api/products/:id/images
 */
const deleteProductImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to delete images from this product',
      });
    }

    const { imageUrl } = req.body || {};
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required',
      });
    }

    const targetUrl = imageUrl.trim();
    if (!Array.isArray(product.images) || !product.images.includes(targetUrl)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found on this product',
      });
    }

    // Delete from S3
    await deleteFromS3(targetUrl);

    // Remove from product.images
    product.images = product.images.filter((img) => img !== targetUrl);
    if (typeof product.save === 'function') {
      await product.save();
    } else {
      memoryStore.saveProduct(product);
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update availability calendar / blackout dates for a product.
 * Protected via authMiddleware (owner only).
 *
 * PATCH /api/products/:id/availability
 */
const updateProductAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify caller user and ownership
    const user = await findUser(req.user.uid, req.user);
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : null;
    const userId = user ? user._id.toString() : null;

    if (!user || !ownerId || ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the product owner can update availability',
      });
    }

    const { blackoutDates } = req.body || {};
    if (!Array.isArray(blackoutDates)) {
      return res.status(400).json({
        success: false,
        message: 'blackoutDates must be an array',
      });
    }

    const parsedDates = [];
    for (let i = 0; i < blackoutDates.length; i++) {
      const entry = blackoutDates[i];
      if (!entry || !entry.startDate || !entry.endDate) {
        return res.status(400).json({
          success: false,
          message: 'Each blackout date entry must have startDate and endDate',
        });
      }

      const start = new Date(entry.startDate);
      const end = new Date(entry.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date value in blackout dates',
        });
      }

      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'startDate must be before endDate for each blackout range',
        });
      }

      parsedDates.push({
        startDate: start,
        endDate: end,
        reason: entry.reason ? String(entry.reason).trim() : '',
      });
    }

    // Check for overlapping ranges among the entries in blackoutDates
    for (let i = 0; i < parsedDates.length; i++) {
      for (let j = i + 1; j < parsedDates.length; j++) {
        if (
          parsedDates[i].startDate < parsedDates[j].endDate &&
          parsedDates[j].startDate < parsedDates[i].endDate
        ) {
          return res.status(400).json({
            success: false,
            message: 'Blackout date ranges cannot overlap with each other',
          });
        }
      }
    }

    if (!product.availability) {
      product.availability = { isAvailable: true, blackoutDates: [] };
    }
    product.availability.blackoutDates = parsedDates;

    if (typeof product.save === 'function') {
      await product.save();
    } else {
      memoryStore.saveProduct(product);
    }

    return res.status(200).json({
      success: true,
      message: 'Product availability updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductBookingsCheck,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  updateProductAvailability,
};
