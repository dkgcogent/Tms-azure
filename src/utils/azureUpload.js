/**
 * azureUpload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for uploading files DIRECTLY from the browser to Azure Blob
 * Storage using a short-lived SAS (Shared Access Signature) URL.
 *
 * Flow
 *   1. Call `getSasUploadUrl(file, entityType)` → backend generates & returns a SAS URL.
 *   2. Call `uploadFileToAzure(file, sasUrl)` → browser PUTs the file straight
 *      to Azure. The file never passes through the Vercel serverless function,
 *      so there is no 4.5 MB body-size limit.
 *   3. The returned `blobUrl` is a permanent, public URL you can store in the DB.
 *
 * Usage (in a form submit handler)
 * ─────────────────────────────────
 *   import { uploadFileDirectly } from '../utils/azureUpload';
 *
 *   // Replace multipart FormData per-file with this helper:
 *   const blobUrl = await uploadFileDirectly(file, 'vehicles');
 *   // Then include blobUrl in your JSON payload to the regular API.
 *
 * OR, to process many files in parallel:
 *   import { uploadFilesDirectly } from '../utils/azureUpload';
 *   const urlMap = await uploadFilesDirectly({ RCUpload: file1, InsuranceCopy: file2 }, 'vehicles');
 *   // urlMap → { RCUpload: 'https://…blob_url…', InsuranceCopy: 'https://…' }
 */

import api from '../services/api';

// ─── Step 1: Ask the backend for a SAS URL ───────────────────────────────────

/**
 * Requests a SAS upload URL from the backend for a single file.
 *
 * @param {File}   file        - The File object selected by the user.
 * @param {string} entityType  - Blob folder name, e.g. 'vehicles', 'customers'.
 * @returns {Promise<{sasUrl: string, blobUrl: string, blobName: string}>}
 */
export async function getSasUploadUrl(file, entityType = 'misc') {
    const response = await api.post('/sas-upload/generate', {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        entityType,
    });

    if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to get SAS upload URL');
    }

    return {
        sasUrl: response.data.sasUrl,    // PUT target (has token)
        blobUrl: response.data.blobUrl,  // Permanent URL (no token) — store in DB
        blobName: response.data.blobName,
    };
}

// ─── Step 2: PUT the file directly to Azure ──────────────────────────────────

/**
 * Uploads a single File object directly to Azure Blob Storage using a SAS URL.
 *
 * @param {File}   file        - The File object to upload.
 * @param {string} sasUrl      - SAS URL obtained from getSasUploadUrl().
 * @param {Function} [onProgress] - Optional progress callback: (percent: number) => void
 * @returns {Promise<void>}
 */
export async function uploadFileToAzure(file, sasUrl, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    onProgress(Math.round((event.loaded / event.total) * 100));
                }
            });
        }

        xhr.addEventListener('load', () => {
            // Azure returns 201 Created on successful blob PUT.
            if (xhr.status === 200 || xhr.status === 201) {
                resolve();
            } else {
                reject(
                    new Error(
                        `Azure upload failed: HTTP ${xhr.status} — ${xhr.responseText || 'Unknown error'}`
                    )
                );
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during Azure blob upload.'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Azure blob upload was aborted.'));
        });

        xhr.open('PUT', sasUrl, true);
        // Azure requires this header to treat the body as a block blob.
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        // Set the correct content type so Azure stores it properly.
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.send(file);
    });
}

// ─── Convenience: getSasUrl + upload in one call ─────────────────────────────

/**
 * Gets a SAS URL and immediately uploads the file to Azure.
 *
 * @param {File}   file         - File object to upload.
 * @param {string} entityType   - Blob folder, e.g. 'vehicles'.
 * @param {Function} [onProgress] - Optional progress callback (0–100).
 * @returns {Promise<string>}   - Resolves to the permanent blob URL (store in DB).
 */
export async function uploadFileDirectly(file, entityType = 'misc', onProgress) {
    if (!(file instanceof File)) {
        throw new Error('uploadFileDirectly: argument must be a File object.');
    }

    const { sasUrl, blobUrl } = await getSasUploadUrl(file, entityType);
    await uploadFileToAzure(file, sasUrl, onProgress);
    return blobUrl;
}

/**
 * Uploads multiple named files in parallel and returns a map of
 * fieldName → blobUrl for each successfully uploaded file.
 *
 * Skips any entry that is not a File object (e.g. null, undefined, string URL).
 *
 * @param {Object<string, File|null>} filesMap  - e.g. { RCUpload: File, InsuranceCopy: File }
 * @param {string}                   entityType - Blob folder name.
 * @param {Function} [onProgress]  - Called with (fieldName, percent).
 * @returns {Promise<Object<string, string>>}   - { fieldName: blobUrl }
 */
export async function uploadFilesDirectly(filesMap, entityType = 'misc', onProgress) {
    const entries = Object.entries(filesMap).filter(
        ([, file]) => file instanceof File
    );

    if (entries.length === 0) return {};

    const results = await Promise.allSettled(
        entries.map(async ([fieldName, file]) => {
            const blobUrl = await uploadFileDirectly(
                file,
                entityType,
                onProgress ? (pct) => onProgress(fieldName, pct) : undefined
            );
            return [fieldName, blobUrl];
        })
    );

    const urlMap = {};
    const errors = [];

    results.forEach((result, index) => {
        const fieldName = entries[index][0];
        if (result.status === 'fulfilled') {
            const [name, url] = result.value;
            urlMap[name] = url;
        } else {
            errors.push(`${fieldName}: ${result.reason?.message || 'upload failed'}`);
        }
    });

    if (errors.length > 0) {
        // Surface all errors in one throw so the caller can handle them.
        throw new Error(`Some files failed to upload:\n${errors.join('\n')}`);
    }

    return urlMap;
}
