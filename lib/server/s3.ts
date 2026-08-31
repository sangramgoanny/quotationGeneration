import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGNED_URL_TTL_SECONDS = 3600; // 1 hour

let cachedClient: S3Client | null = null;

function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS S3 is not configured: set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
  }

  cachedClient = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return cachedClient;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error("AWS S3 is not configured: set AWS_S3_BUCKET_NAME");
  return bucket;
}

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  const bucket = getBucket();
  await getS3Client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  const bucket = getBucket();
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// The bucket is private (documents can include GST certificates, PAN cards,
// cancelled cheques, etc.), so objects are never served from the plain
// bucket URL - callers get a short-lived signed URL generated on demand.
export async function getPresignedUrl(key: string): Promise<string> {
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
}

// Same as getPresignedUrl, but tells S3 to respond with Content-Disposition:
// attachment so the browser saves the file instead of opening it inline -
// the plain `download` attribute on an <a> tag is ignored for cross-origin
// URLs like this one, so the header has to come from S3 itself.
export async function getPresignedDownloadUrl(key: string, filename: string): Promise<string> {
  const bucket = getBucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
}
