import { S3Event, Handler } from "aws-lambda";
import { S3, SQS } from "aws-sdk";
import csv from "csv-parser";

const s3 = new S3();
const sqs = new SQS();
const sqsUrl = process.env.SQS_URL

export const handler: Handler<S3Event> = async (event) => {
  try {
    console.log(
      "ImportFileParser Lambda function has been invoked with event:",
      JSON.stringify(event)
    );
    if (!event.Records || event.Records.length === 0) {
      console.error("No records found in the event");
      throw new Error("No records found in the event");
    }
    // Get bucket and key from the S3 event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(
      event.Records[0].s3.object.key.replace(/\+/g, " ")
    );

    console.log(`Processing file ${key} from bucket ${bucket}`);

    try {
      // Create a readable stream from S3 object
      const s3Stream = s3
        .getObject({
          Bucket: bucket,
          Key: key,
        })
        .createReadStream();

      // Process the stream using csv-parser
      await new Promise((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on("data", (data) => {
            // Log each record from CSV
            console.log("Parsed record:", JSON.stringify(data));
            // Send each record to SQS
            sqs.sendMessage(
              {
                QueueUrl: sqsUrl,
                MessageBody: JSON.stringify(data),
              },
              (error, data) => {
                if (error) {
                  console.error("Error sending message to SQS:", error);
                } else {
                  console.log("Message sent to SQS:", data.MessageId);
                }
              }
            );
          })
          .on("error", (error) => {
            console.error("Error parsing CSV:", error);
            reject(error);
          })
          .on("end", () => {
            console.log("Finished processing CSV file");
            resolve(null);
          });

        console.log("CSV processing completed successfully");
      });

      const newKey = key.replace("uploaded/", "parsed/");

      await s3
        .copyObject({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: newKey,
        })
        .promise();

      await s3
        .deleteObject({
          Bucket: bucket,
          Key: key,
        })
        .promise();

      console.log(`Successfully moved file from ${key} to ${newKey}`);
    } catch (error) {
      console.error("Error processing file:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
