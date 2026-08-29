const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth.middleware');
const optionalAuth = authMiddleware.optionalAuth || authMiddleware;
const {
  getProducts,
  getProductById,
  getProductBookingsCheck,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  updateProductAvailability,
} = require('../controllers/product.controller');

// Multer memory storage configuration for product image uploads
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    req.fileValidationError = 'Only JPG, PNG, and WebP images are allowed';
    cb(null, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

router.get('/', optionalAuth, getProducts);
router.get('/:id/bookings-check', authMiddleware, getProductBookingsCheck);
router.get('/:id', getProductById);
router.post('/', authMiddleware, createProduct);
router.patch('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);
router.patch('/:id/availability', authMiddleware, updateProductAvailability);

router.post('/:id/images', authMiddleware, upload.single('image'), uploadProductImage);
router.delete('/:id/images', authMiddleware, deleteProductImage);

module.exports = router;

