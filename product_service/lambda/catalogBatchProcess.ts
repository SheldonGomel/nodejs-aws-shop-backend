import { SQSEvent } from "aws-lambda";
import { createProduct } from "../services/createProduct";

// Lambda function to process SQS messages for product catalog
export const catalogBatchProcess = async (event: SQSEvent): Promise<void> => {
  try {
    console.log("Received SQS event:", JSON.stringify(event));

    // Process each message in the batch
    for (const record of event.Records) {
      const product = JSON.parse(record.body);
      console.log("Processing product:", product);

      // Create product in database
      await createProduct(product);
      console.log("Successfully created product:", product.id);
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error;
  }
};
