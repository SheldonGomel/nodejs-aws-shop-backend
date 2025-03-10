import * as AWS from "aws-sdk";

const BUCKET = process.env.BUCKET_NAME || "aws-rss-backend";
const s3 = new AWS.S3({ region: process.env.AWS_REGION || "eu-west-1" });

export const getSignedUrl = async (fileName: string): Promise<string> => {
  console.log("getSignedUrl", fileName);
  const params = {
    Bucket: BUCKET,
    Key: `uploaded/${fileName}`,
    ContentType: "text/csv",
    Expires: 3600,
  };

  return await s3.getSignedUrlPromise("putObject", params);
};
