# TMS File Handling System

## Overview

The TMS application now has a comprehensive file handling system that provides consistent file preview, viewing, and downloading functionality across the entire application.

## Components

### 1. FilePreview Component (`src/components/FilePreview.jsx`)

Universal component for displaying file previews with view/download actions.

**Features:**
- **Images**: Thumbnail preview with click-to-expand modal
- **PDFs**: Icon with View and Download buttons
- **Documents**: Icon with View and Download buttons
- **Responsive design** with mobile support
- **Customizable styling** and actions

**Usage:**
```jsx
import FilePreview from '../components/FilePreview';

// Basic usage
<FilePreview file={fileObject} />

// With custom options
<FilePreview 
  file={fileObject}
  baseUrl="http://localhost:3004"
  showActions={true}
  showModal={true}
  onRemove={() => handleRemove()}
  maxPreviewSize={{ width: 300, height: 200 }}
/>
```

### 2. Enhanced DocumentUpload Component

Updated with improved PDF viewing and download functionality.

**Features:**
- **Images**: Preview with modal viewing
- **PDFs**: View in new tab + Download button
- **Documents**: View + Download buttons
- **File validation** and error handling

### 3. Enhanced KMImageUpload Component

Updated with modal viewing for full-size image preview.

**Features:**
- **Click-to-expand** image preview
- **Modal overlay** with full-size viewing
- **Drag & drop** support maintained

### 4. File Utilities (`src/utils/fileUtils.js`)

Comprehensive utility functions for file handling.

**Functions:**
- `isImageFile(file)` - Detects image files
- `isPDFFile(file)` - Detects PDF files
- `getFileType(file)` - Returns 'image', 'pdf', or 'document'
- `createPreviewUrl(file, baseUrl)` - Creates preview URLs
- `viewFile(fileUrl, fileName)` - Opens files for viewing
- `downloadFile(fileUrl, fileName)` - Downloads files
- `validateFile(file, options)` - Validates file type and size
- `formatFileSize(bytes)` - Formats file sizes for display

## Implementation Across Application

### 1. Transaction Forms
- **Create Mode**: File upload with immediate preview
- **Edit Mode**: Show existing files with view/download options
- **View Mode**: Display all files with preview and download

### 2. Master Data Forms (Vehicles, Vendors, Drivers, etc.)
- **Document uploads** with preview
- **Photo galleries** with modal viewing
- **File management** during edit operations

### 3. Reports and Data Tables
- **File columns** show preview thumbnails
- **Click actions** for viewing/downloading
- **Consistent UI** across all tables

## File Type Handling

### Images (JPG, PNG, GIF, etc.)
- **Thumbnail preview** in forms
- **Click-to-expand** modal with full-size view
- **Download option** available
- **Supported formats**: JPG, JPEG, PNG, GIF, BMP, WEBP, SVG

### PDFs
- **PDF icon** with file name
- **View button**: Opens in new tab with embedded viewer
- **Download button**: Direct download
- **Fallback handling** for viewing errors

### Documents (DOC, DOCX, etc.)
- **Document icon** with file name
- **View button**: Opens in new tab
- **Download button**: Direct download
- **Generic handling** for all document types

## API Integration

### File URLs
- **Relative paths** automatically converted to full URLs
- **Base URL** configurable (default: `http://localhost:3004`)
- **Cache busting** for updated files
- **Error handling** for missing files

### Upload Endpoints
- **Existing endpoints** maintained
- **File validation** on both client and server
- **Progress indicators** during upload
- **Error feedback** for failed uploads

## Usage Examples

### 1. Basic File Preview
```jsx
// In any component
import FilePreview from '../components/FilePreview';

const MyComponent = ({ document }) => {
  return (
    <div>
      <h3>Document Preview</h3>
      <FilePreview file={document} />
    </div>
  );
};
```

### 2. File Upload with Preview
```jsx
import DocumentUpload from '../components/DocumentUpload';

const MyForm = () => {
  const [file, setFile] = useState(null);
  
  return (
    <DocumentUpload
      label="Upload Document"
      name="document"
      value={file}
      onChange={(e) => setFile(e.target.files[0])}
      accept=".pdf,.jpg,.png,.doc,.docx"
    />
  );
};
```

### 3. Image Gallery with Modal
```jsx
import { useState } from 'react';
import FilePreview from '../components/FilePreview';

const ImageGallery = ({ images }) => {
  return (
    <div className="image-gallery">
      {images.map((image, index) => (
        <FilePreview 
          key={index}
          file={image}
          showModal={true}
          maxPreviewSize={{ width: 150, height: 150 }}
        />
      ))}
    </div>
  );
};
```

### 4. Data Table with File Columns
```jsx
const FileColumn = ({ file }) => {
  if (!file) return <span>No file</span>;
  
  return (
    <FilePreview 
      file={file}
      showActions={true}
      maxPreviewSize={{ width: 50, height: 50 }}
    />
  );
};
```

## Styling

### CSS Classes
- `.file-preview` - Main container
- `.file-preview-image` - Image preview container
- `.file-preview-pdf` - PDF preview container
- `.file-preview-document` - Document preview container
- `.file-preview-actions` - Action buttons container
- `.file-preview-modal-*` - Modal styling classes

### Customization
```css
/* Custom styling example */
.my-file-preview .file-preview {
  border: 2px solid #007bff;
  border-radius: 12px;
}

.my-file-preview .file-action-btn {
  background-color: #28a745;
  color: white;
}
```

## Browser Compatibility

- **Modern browsers**: Full functionality
- **PDF viewing**: Fallback to download if viewing fails
- **File downloads**: Universal support
- **Modal overlays**: CSS3 compatible browsers

## Performance Considerations

- **Lazy loading**: Images loaded on demand
- **Memory management**: Blob URLs cleaned up automatically
- **File size limits**: Configurable per component
- **Caching**: Browser caching for server files

## Security

- **File type validation**: Client and server-side
- **Size limits**: Prevent large file uploads
- **URL sanitization**: Prevent XSS attacks
- **CORS handling**: Proper cross-origin requests

## Future Enhancements

1. **Drag & drop** for all file components
2. **Progress bars** for large file uploads
3. **Batch operations** for multiple files
4. **Cloud storage** integration
5. **File compression** for images
6. **OCR support** for document text extraction
