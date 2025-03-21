import { SQSEvent, SQSRecord, SQSRecordAttributes } from "aws-lambda";
import { handler } from "./catalogBatchProcess";
import { createProduct } from "../services/createProduct";
import { validateProduct } from "../utils/validators";
import SNSClient from "aws-sdk/clients/sns";

jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log
jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error

const publishMock = jest.fn().mockImplementation(() => ({
  promise: () => Promise.resolve(true),
}));

jest.mock("aws-sdk/clients/sns", () => {
  const mSNS = {
    publish: (params: SNSClient.PublishInput) => publishMock(params),
    promise: jest.fn(),
  };
  return jest.fn(() => mSNS);
});
jest.mock("../services/createProduct");
jest.mock("../utils/validators");

describe("catalogBatchProcess lambda", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.IMPORT_PRODUCTS_SNS_ARN =
      "arn:aws:sns:eu-west-1:123456789012:importProductsTopic";
  });

  const createSQSRecord = (body: any): SQSRecord => ({
    messageId: "1",
    receiptHandle: "abc",
    body: JSON.stringify(body),
    attributes: {} as SQSRecordAttributes,
    messageAttributes: {},
    md5OfBody: "",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:eu-west-1:123456789012:importProductsQueue",
    awsRegion: "eu-west-1",
  });

  test("should process SQS messages successfully", async () => {
    const mockProduct = {
      title: "Product1",
      description: "Description1",
      price: 30,
    };
    const mockNewProduct = { id: "1", ...mockProduct };

    (validateProduct as jest.Mock).mockReturnValue({ isError: false });
    (createProduct as jest.Mock).mockResolvedValue(mockNewProduct);

    const event: SQSEvent = {
      Records: [createSQSRecord(mockProduct)],
    };

    await handler(event);

    expect(validateProduct).toHaveBeenCalledWith(mockProduct);
    expect(createProduct).toHaveBeenCalledWith(mockProduct);
    expect(publishMock).toHaveBeenCalledWith({
      Subject: "Product created",
      Message: "Product with ids: 1 successfuly created!",
      TopicArn: process.env.IMPORT_PRODUCTS_SNS_ARN,
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: "30",
        },
      },
    });
  });

  test("should handle validation failure", async () => {
    const mockProduct = { title: "Product1", description: "Description1" };

    (validateProduct as jest.Mock).mockReturnValue({ isError: true });

    const event: SQSEvent = {
      Records: [createSQSRecord(mockProduct)],
    };

    await handler(event);

    expect(validateProduct).toHaveBeenCalledWith(mockProduct);
    expect(createProduct).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  test("should handle errors during processing", async () => {
    const mockProduct = { title: "Product1", description: "Description1" };

    (validateProduct as jest.Mock).mockReturnValue({ isError: false });
    (createProduct as jest.Mock).mockRejectedValue(new Error("Database error"));

    const event: SQSEvent = {
      Records: [createSQSRecord(mockProduct)],
    };

    await expect(handler(event)).rejects.toThrow("Database error");

    expect(validateProduct).toHaveBeenCalledWith(mockProduct);
    expect(createProduct).toHaveBeenCalledWith(mockProduct);
    expect(publishMock).not.toHaveBeenCalled();
  });
});
