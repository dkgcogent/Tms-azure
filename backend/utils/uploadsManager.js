const fs = require('fs');
const path = require('path');

/**
 * Uploads Directory Manager
 * Handles automatic creation and management of external uploads directories
 */
class UploadsManager {
  constructor() {
    // Get uploads directory from environment variable or use default
    this.baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), '../tms-uploads');
    
    // Define subdirectories for different entity types
    this.subdirectories = [
      'transactions',
      'customers', 
      'vendors',
      'drivers',
      'vehicles',
      'projects'
    ];
    
    console.log('📁 UploadsManager initialized with base directory:', this.baseUploadsDir);
  }

  /**
   * Initialize all required upload directories
   * This should be called during server startup
   */
  async initializeDirectories() {
    try {
      console.log('📁 Initializing uploads directories...');
      
      // Create base uploads directory if it doesn't exist
      if (!fs.existsSync(this.baseUploadsDir)) {
        fs.mkdirSync(this.baseUploadsDir, { recursive: true });
        console.log('✅ Created base uploads directory:', this.baseUploadsDir);
      } else {
        console.log('✅ Base uploads directory already exists:', this.baseUploadsDir);
      }

      // Create subdirectories for each entity type
      for (const subdir of this.subdirectories) {
        const fullPath = path.join(this.baseUploadsDir, subdir);
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          console.log(`✅ Created subdirectory: ${subdir}`);
        } else {
          console.log(`✅ Subdirectory already exists: ${subdir}`);
        }
      }

      console.log('🎉 All uploads directories initialized successfully!');
      console.log('📂 Directory structure:');
      console.log(`   ${this.baseUploadsDir}/`);
      this.subdirectories.forEach(subdir => {
        console.log(`   ├── ${subdir}/`);
      });

      return true;
    } catch (error) {
      console.error('❌ Error initializing uploads directories:', error);
      throw error;
    }
  }

  /**
   * Get the full path for a specific entity type
   * @param {string} entityType - The entity type (transactions, customers, etc.)
   * @returns {string} Full path to the entity's upload directory
   */
  getEntityUploadPath(entityType) {
    if (!this.subdirectories.includes(entityType)) {
      throw new Error(`Invalid entity type: ${entityType}. Valid types: ${this.subdirectories.join(', ')}`);
    }
    return path.join(this.baseUploadsDir, entityType);
  }

  /**
   * Get the base uploads directory path
   * @returns {string} Base uploads directory path
   */
  getBaseUploadPath() {
    return this.baseUploadsDir;
  }

  /**
   * Ensure a specific entity directory exists
   * @param {string} entityType - The entity type
   */
  ensureEntityDirectory(entityType) {
    const entityPath = this.getEntityUploadPath(entityType);
    if (!fs.existsSync(entityPath)) {
      fs.mkdirSync(entityPath, { recursive: true });
      console.log(`✅ Created missing directory: ${entityType}`);
    }
    return entityPath;
  }

  /**
   * Get relative path for database storage
   * @param {string} entityType - The entity type
   * @param {string} filename - The filename
   * @returns {string} Relative path for database storage
   */
  getRelativePath(entityType, filename) {
    return `${entityType}/${filename}`;
  }

  /**
   * Get full file path from relative path
   * @param {string} relativePath - Relative path from database
   * @returns {string} Full file path
   */
  getFullPath(relativePath) {
    return path.join(this.baseUploadsDir, relativePath);
  }

  /**
   * Check if a file exists
   * @param {string} relativePath - Relative path from database
   * @returns {boolean} True if file exists
   */
  fileExists(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    return fs.existsSync(fullPath);
  }
}

// Create singleton instance
const uploadsManager = new UploadsManager();

module.exports = uploadsManager;
