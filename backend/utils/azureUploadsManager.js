const { BlobServiceClient } = require("@azure/storage-blob");
const path = require("path");

class AzureStorageEngine {
  constructor(options) {
    this.connectionString = options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = options.containerName || process.env.AZURE_CONTAINER_NAME || process.env.container_name;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    this.getDestination = options.getDestination;

    // Ensure container exists
    this.containerClient.createIfNotExists({ access: "container" }).catch(err => {
      console.error("Error creating container:", err.message);
    });
  }

  _handleFile(req, file, cb) {
    // Determine destination folder (entity type) based on req info or existing convention
    // In existing logic, 'destination' function determines folder. 
    // We can assume a default or use a custom option if needed, but Multer's custom engine usually handles one file.
    // However, existing simple engines just stream.

    // We'll treat the "destination" concept as the folder prefix in the blob name.
    // How to get the folder name? 
    // The existing diskStorage logic relied on `uploadsManager.ensureEntityDirectory('drivers')` etc side-effect and returning a path.
    // Here we need to know the 'entityType' to put in the blob name like "drivers/filename.jpg".

    // We can pass a function `getDestination` to the constructor options, similar to diskStorage.

    let folder = "misc";
    if (this.getDestination) {
      this.getDestination(req, file, (err, dest) => {
        if (err) return cb(err);
        // dest might be an absolute path from the old logic, we want just the folder name 
        // OR we just adapt the routes to pass the folder name string literally.
        // For now, let's look at how the routes call it. 
        // customer.js: uploadsManager.ensureEntityDirectory('customers'), 
        // The result of this is an absolute path.
        // We probably want to extract the last part of the path or rely on a new convention.

        // Let's rely on a helper to extract standardized folder names or just expect routes to be updated to pass a string.
        // I will assume for this engine that the "destination" returned by the callback IS the folder name (e.g., 'customers').
        folder = dest;
        this._uploadToAzure(folder, file, cb);
      });
    } else {
      // Fallback or error
      this._uploadToAzure(folder, file, cb);
    }
  }

  _uploadToAzure(folder, file, cb) {
    const timestamp = Date.now();
    // Sanitize original name
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobName = `${folder}/${timestamp}-${sanitizedOriginalName}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    const uploadOptions = {
      blobHTTPHeaders: {
        blobContentType: file.mimetype
      }
    };

    // uploadData accepts a buffer, stream, string, etc.
    // Multer gives us a stream (file.stream).
    blockBlobClient.uploadStream(file.stream, undefined, undefined, uploadOptions)
      .then(response => {
        cb(null, {
          path: blockBlobClient.url, // Multer expects 'path' for the file location
          filename: blobName,
          size: file.size, // Might be undefined with stream
          destination: folder
        });
      })
      .catch(err => {
        cb(err);
      });
  }

  _removeFile(req, file, cb) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(file.filename);
    blockBlobClient.delete()
      .then(() => cb(null))
      .catch(err => cb(err));
  }
}

module.exports = (options) => new AzureStorageEngine(options);
