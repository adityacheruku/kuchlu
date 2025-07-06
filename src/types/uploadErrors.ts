
export enum UploadErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CLOUDINARY_API_ERROR = 'CLOUDINARY_API_ERROR',
  STORAGE_FULL = 'STORAGE_FULL',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  VALIDATION_FAILED = 'VALIDATION_FAILED'
}

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  details?: Record<string, any>;
}

export const ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  [UploadErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum limit.',
  [UploadErrorCode.INVALID_FILE_TYPE]: 'This file type is not supported.',
  [UploadErrorCode.NETWORK_ERROR]: 'A network error occurred. Please check your connection.',
  [UploadErrorCode.SERVER_ERROR]: 'A server error occurred during upload.',
  [UploadErrorCode.CLOUDINARY_API_ERROR]: 'The media service returned an error.',
  [UploadErrorCode.STORAGE_FULL]: 'Upload failed because storage is full.',
  [UploadErrorCode.TIMEOUT]: 'The upload timed out.',
  [UploadErrorCode.CANCELLED]: 'The upload was cancelled by the user.',
  [UploadErrorCode.VALIDATION_FAILED]: 'The file is not valid for upload.'
};

export function getUploadError(code: UploadErrorCode, details?: Record<string, any>): UploadError {
    const message = ERROR_MESSAGES[code] || 'An unknown error occurred.';
    
    // Define retryability based on error code
    const retryableCodes = [
        UploadErrorCode.NETWORK_ERROR,
        UploadErrorCode.SERVER_ERROR,
        UploadErrorCode.TIMEOUT,
        UploadErrorCode.CLOUDINARY_API_ERROR // Sometimes retryable
    ];
    
    return {
        code,
        message,
        retryable: retryableCodes.includes(code),
        details,
    };
}
