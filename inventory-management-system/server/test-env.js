import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('=== ENVIRONMENT VARIABLES ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('URI length:', process.env.MONGODB_URI?.length);
console.log('URI starts with mongodb+srv:', process.env.MONGODB_URI?.startsWith('mongodb+srv://'));
console.log('Contains @cluster0:', process.env.MONGODB_URI?.includes('@cluster0'));
console.log('Contains database name:', process.env.MONGODB_URI?.includes('inventory-management'));
console.log('===============================');