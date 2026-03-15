import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
  size: String,
  quantity: {
    type: Number,
    default: 0
  },
  minStock: {
    type: Number,
    default: 5
  }
});

const colorVariantSchema = new mongoose.Schema({
  colorName: {
    type: String,
    required: true
  },
  images: [String],
  sizes: [sizeSchema]
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true
  },
  brand: String,
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  purchasePrice: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  gst: {
    type: Number,
    default: 5
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  tags: [String],
  colorVariants: [colorVariantSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for total quantity
productSchema.virtual('totalQuantity').get(function() {
  let total = 0;
  this.colorVariants.forEach(variant => {
    variant.sizes.forEach(size => {
      total += size.quantity;
    });
  });
  return total;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export default mongoose.model('Product', productSchema);