export interface SqsExtendedClientOptions {
    s3BucketName: string;
    messageSizeThreshold?: number;
    alwaysThroughS3?: boolean;
    useLegacyAttribute?: boolean;
}
export interface S3Pointer {
    s3BucketName: string;
    s3Key: string;
}
