import { SQSEvent } from "aws-lambda";
import { createProduct } from "../services/createProduct";
import { validateProduct } from "../utils/validators";
import SNSClient from "aws-sdk/clients/sns";

const snsClient = new SNSClient({ region: "eu-west-1" });

// Lambda function to process SQS messages for product catalog
export const handler = async (event: SQSEvent): Promise<void> => {
  try {
    console.log("Received SQS event:", JSON.stringify(event));

    const records = event.Records || [];

    const products = [];

    // Process each message in the batch
    for (const record of records) {
      const product = JSON.parse(record.body);

      // Validate product
      const validation = validateProduct(product);
      if (validation.isError) {
        console.error("Validation failed for product:", product);
        continue;
      }
      console.log("Processing product:", product);

      // Create product in database
      const newProduct = await createProduct(product);
      products.push(newProduct);
      console.log("Successfully created product:", newProduct.id);
      // Send notification to SNS topic
      const snsTopicArn = process.env.IMPORT_PRODUCTS_SNS_ARN;

      if (!snsTopicArn) {
        console.error("SNS topic ARN not found in environment variables");
        continue;
      }
      const snsParams = {
        Subject: "Product created",
        Message: `Product with ids: ${newProduct.id} successfuly created!`,
        TopicArn: snsTopicArn,
        MessageAttributes: {
          price: {
            DataType: "Number",
            StringValue: newProduct.price.toString(),
          },
        },
      };
      await snsClient.publish(snsParams).promise();
    }
  } catch (error) {
    console.error("Error processing batch:", error);
    throw error;
  }
};
