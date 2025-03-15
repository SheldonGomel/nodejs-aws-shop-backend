import { SQSEvent } from "aws-lambda";
import { createProduct } from "../services/createProduct";

// Lambda function to process SQS messages for product catalog
export const handler = async (event: SQSEvent): Promise<void> => {
  try {
    console.log("Received SQS event:", JSON.stringify(event));

    const records = event.Records || [];

    // Process each message in the batch
    for (const record of records) {
      const product = JSON.parse(record.body);
      console.log("Processing product:", product);

      // Create product in database
      const newProduct = await createProduct(product);
      console.log("Successfully created product:", newProduct.id);
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error;
  }
};
