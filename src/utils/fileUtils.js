/**
 * Universal File Utilities for TMS Application
 * Handles file preview, download, and viewing across the entire application
 */

/**
 * Determines if a file is an image based on its extension or MIME type
 * @param {string|File} file - File path, URL, or File object
 * @returns {boolean}
 */
export const isImageFile = (file) => {
  if (!file) return false;

  let fileName = '';
  if (typeof file === 'string') {
    fileName = file;
  } else if (file instanceof File) {
    fileName = file.name;
    // Also check MIME type for File objects
    if (file.type && file.type.startsWith('image/')) {
      return true;
    }
  } else if (file.name) {
    fileName = file.name;
  }

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const extension = fileName.split('.').pop()?.toLowerCase();
  return imageExtensions.includes(extension);
};

/**
 * Determines if a file is a PDF based on its extension or MIME type
 * @param {string|File} file - File path, URL, or File object
 * @returns {boolean}
 */
export const isPDFFile = (file) => {
  if (!file) return false;

  if (file instanceof File) {
    return file.type === 'application/pdf';
  }

  const fileName = typeof file === 'string' ? file : file.name || '';
  return fileName.toLowerCase().endsWith('.pdf');
};

/**
 * Gets the file type category for display purposes
 * @param {string|File} file - File path, URL, or File object
 * @returns {string} - 'image', 'pdf', or 'document'
 */
export const getFileType = (file) => {
  if (isImageFile(file)) return 'image';
  if (isPDFFile(file)) return 'pdf';
  return 'document';
};

/**
 * Creates a preview URL for a file
 * @param {File|string} file - File object or URL string
 * @param {string} baseUrl - Base URL for server files (optional)
 * @returns {string|null} - Preview URL or null if not available
 */
export const createPreviewUrl = (file, baseUrl = '') => {
  if (!file) return null;

  if (file instanceof File) {
    return URL.createObjectURL(file);
  }

  if (typeof file === 'string') {
    // If it's already a full URL, return as is
    if (file.startsWith('http')) {
      return file;
    }

    // If it's a relative path, construct full URL
    const normalizedPath = file.replace(/\\/g, '/');
    return `${baseUrl}/uploads/${normalizedPath}`;
  }

  return null;
};

/**
 * Opens a file for viewing in a new tab/window
 * @param {string} fileUrl - URL of the file to view
 * @param {string} fileName - Name of the file (for fallback download)
 */
export const viewFile = (fileUrl, fileName = 'document') => {
  if (!fileUrl) {
    alert('File URL not available');
    return;
  }

  try {
    if (isPDFFile(fileUrl)) {
      // For PDFs, create a better viewer experience
      if (fileUrl.startsWith('blob:')) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>PDF Viewer - ${fileName}</title>
                <style>
                  body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                  .loading { text-align: center; padding: 50px; }
                  iframe { width: 100%; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <div class="loading">Loading PDF...</div>
                <iframe src="${fileUrl}" onload="document.querySelector('.loading').style.display='none'"></iframe>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      // For other files, open directly
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error('Error opening file:', error);
    alert('Unable to open file. Please try downloading instead.');
  }
};

/**
 * Downloads a file
 * @param {string} fileUrl - URL of the file to download
 * @param {string} fileName - Name for the downloaded file
 */
export const downloadFile = (fileUrl, fileName = 'download') => {
  if (!fileUrl) {
    alert('File URL not available');
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Unable to download file. Please try viewing instead.');
  }
};

/**
 * Gets the appropriate file icon based on file type
 * @param {string|File} file - File path, URL, or File object
 * @returns {string} - Emoji icon for the file type
 */
export const getFileIcon = (file) => {
  const fileType = getFileType(file);

  switch (fileType) {
    case 'image':
      return '🖼️';
    case 'pdf':
      return '📄';
    default:
      return '📄';
  }
};

/**
 * Formats file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validates file type and size
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @param {string[]} options.allowedTypes - Array of allowed MIME types
 * @param {number} options.maxSize - Maximum file size in MB
 * @returns {Object} - Validation result with isValid and error properties
 */
export const validateFile = (file, options = {}) => {
  const { allowedTypes = [], maxSize = 20 } = options;

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  // Check file type
  if (allowedTypes.length > 0) {
    const isTypeAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isTypeAllowed) {
      return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
    }
  }

  // Check file size
  if (file.size > maxSize * 1024 * 1024) {
    return { isValid: false, error: `File size must be less than ${maxSize}MB` };
  }

  return { isValid: true, error: null };
};

/**
 * Creates a universal file preview component data
 * @param {string|File} file - File to create preview for
 * @param {Object} options - Preview options
 * @returns {Object} - Preview data object
 */
export const createFilePreviewData = (file, options = {}) => {
  const { baseUrl = '', showActions = true } = options;

  if (!file) return null;

  const fileType = getFileType(file);
  const previewUrl = createPreviewUrl(file, baseUrl);
  const fileName = typeof file === 'string'
    ? file.split('/').pop().split('\\').pop()
    : file.name || 'Unknown file';

  return {
    file,
    fileName,
    fileType,
    previewUrl,
    icon: getFileIcon(file),
    size: file instanceof File ? formatFileSize(file.size) : null,
    showActions,
    actions: {
      view: () => viewFile(previewUrl, fileName),
      download: () => downloadFile(previewUrl, fileName)
    }
  };
};
