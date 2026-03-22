import mongoose from 'mongoose';

// Define all available categories and their subcategories
export const CATEGORIES = {
  'Shirts': [
    'Linen', 'Embroidery', 'Flannel', 'Viscose', 'Designer',
    'Mandarin collar', 'Oxford', 'Double pocket', 'Corduroy',
    'Stained', 'Drop shoulder', 'Oversized'
  ],
  'Trousers/Pants': [
    'Linen pants', 'Formal trousers', 'Straight fit jeans',
    'Baggy fit jeans', 'Patched jeans', 'Cargo pants', 'Gurkha pants'
  ],
  'Sets & Occasion Wear': [
    'Wedding outfits', 'Formal suit combos (Size M to XXL)',
    'Sherwani sets', 'Indo-western outfits'
  ],
  'Other Categories': [
    'Vintage Tees', 'Casual streetwear', 'Trendy jackets',
    'Hoodies', 'Sweatshirts'
  ]
};

export const ALL_SUBCATEGORIES = Object.values(CATEGORIES).flat();

const supplierSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        address: {
            type: String,
            required: true,
        },
        gst: {  // ✅ CHANGE: Use 'gst' instead of 'gstNumber'
            type: String,
            required: true,
            unique: true,
            uppercase: true,
        },
        categories: [
            {
                mainCategory: {
                    type: String,
                    enum: Object.keys(CATEGORIES),
                    required: true,
                },
                subCategories: [{
                    type: String,
                    enum: ALL_SUBCATEGORIES,
                }],
            }
        ],
        products: [
            {
                type: String,
            }
        ],
        paymentTerms: {
            type: String,
            enum: ['Immediate', '7 days', '15 days', '30 days', '45 days', '60 days'],
            default: '30 days',
        },
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Index for search - use 'gst' not 'gstNumber'
supplierSchema.index({ name: 'text', email: 'text', gst: 'text' });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;