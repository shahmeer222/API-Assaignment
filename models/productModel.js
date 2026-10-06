const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    image: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Full browser URL for the stored image, handy for API consumers
productSchema.virtual('imageUrl').get(function () {
  if (!this.image) return null;
  return `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`}/${this.image}`;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
