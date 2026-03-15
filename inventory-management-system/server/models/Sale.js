import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  color: String,
  size: String,
  gst: Number
});

const saleSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true
  },
  customerName: String,
  phoneNumber: String,
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  gst: {
    type: Number,
    default: 0
  },
  cgst: Number,
  sgst: Number,
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card'],
    required: true
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Cancelled'],
    default: 'Paid'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Sale', saleSchema);