import Product from '../models/Product.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/products');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
}).array('images', 10); // Max 10 images

export const getProducts = async (req, res) => {
  try {
    const { search, category, supplier, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) query.category = category;
    if (supplier) query.supplier = supplier;
    if (status) query.status = status;

    const products = await Product.find(query).populate('supplier', 'name');
    
    // Add full image URLs
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const productsWithImageUrls = products.map(product => {
      const productObj = product.toObject();
      if (productObj.colorVariants) {
        productObj.colorVariants = productObj.colorVariants.map(variant => {
          if (variant.images) {
            variant.images = variant.images.map(img => {
              // If it's already a full URL, return as is
              if (img.startsWith('http')) return img;
              // Otherwise, construct the URL
              return `${baseUrl}/uploads/products/${img}`;
            });
          }
          return variant;
        });
      }
      return productObj;
    });
    
    res.json(productsWithImageUrls);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const uploadProductImages = async (req, res) => {
  try {
    upload(req, res, async function(err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: 'File upload error: ' + err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const files = req.files.map(file => file.filename);
      res.json({ 
        message: 'Files uploaded successfully', 
        files: files,
        urls: files.map(f => `http://localhost:5000/uploads/products/${f}`)
      });
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    // Delete associated images
    if (product && product.colorVariants) {
      product.colorVariants.forEach(variant => {
        if (variant.images && variant.images.length > 0) {
          variant.images.forEach(image => {
            // Extract filename from URL if it's a full URL
            const filename = image.includes('/') ? image.split('/').pop() : image;
            const imagePath = path.join(__dirname, '../uploads/products/', filename);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          });
        }
      });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      'colorVariants.sizes': {
        $elemMatch: {
          $expr: { $lte: ['$quantity', '$minStock'] }
        }
      }
    });
    res.json(products);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ message: error.message });
  }
};