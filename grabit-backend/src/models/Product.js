const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
    rentalPrice: {
      perDay: {
        type: Number,
        required: true,
        min: 0,
      },
      perWeek: {
        type: Number,
        min: 0,
      },
      securityDeposit: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    damageProtection: {
      isAvailable: {
        type: Boolean,
        default: false,
      },
      fee: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      blackoutDates: [
        {
          startDate: {
            type: Date,
          },
          endDate: {
            type: Date,
          },
          reason: {
            type: String,
          },
        },
      ],
    },
    location: {
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      coordinates: [
        {
          type: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
