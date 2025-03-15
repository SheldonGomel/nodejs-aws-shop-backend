import { S3Event } from "aws-lambda";
import { S3 } from "aws-sdk";
import { Readable } from "stream";
import { handler } from "./importFileParser";

jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log
jest.spyOn(console, "error").mockImplementation(() => {}); // Suppress console.error

// create Stream from string
const stream = new Readable();

stream.push("title,description\n");
stream.push(`Product1,Description1\n`);
stream.push(`Product2,Description2\n`);
stream.push(null); // end of stream

// const createReadStreamMock = jest.fn(); //.mockImplementation(() => stream);

const getObjectMock = jest.fn().mockImplementation(() => ({
  createReadStream: () => stream,
}));

const copyObjectMock = jest.fn().mockImplementation(() => ({
  promise: () => Promise.resolve(true),
}));
const deleteObjectMock = jest.fn().mockImplementation(() => ({
  promise: () => Promise.resolve(true),
}));

jest.mock("aws-sdk", () => {
  return {
    S3: jest.fn().mockImplementation(() => ({
      getObject: (params: S3.Types.GetObjectRequest) => getObjectMock(params),
      copyObject: (params: S3.Types.CopyObjectRequest) =>
        copyObjectMock(params),
      deleteObject: (params: S3.Types.DeleteObjectRequest) =>
        deleteObjectMock(params),
    })),
  };
});

describe("importFileParser Lambda", () => {
  // let s3Instance: S3;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvent: S3Event = {
    Records: [
      {
        s3: {
          bucket: {
            name: "test-bucket",
          },
          object: {
            key: "uploaded/test-file.csv",
          },
        },
      },
    ],
  } as any;

  test("should process CSV file successfully", async () => {

    await handler(mockEvent, {} as any, () => {});

    const bucketName = mockEvent.Records[0].s3.bucket.name;
    const objectKey = mockEvent.Records[0].s3.object.key;

    expect(getObjectMock).toHaveBeenCalledTimes(1);
    expect(getObjectMock).toHaveBeenCalledWith({
      Bucket: bucketName,
      Key: objectKey,
    });
    expect(copyObjectMock).toHaveBeenCalledTimes(1);
    expect(copyObjectMock).toHaveBeenCalledWith({
      Bucket: bucketName,
      CopySource: `${bucketName}/${objectKey}`,
      Key: objectKey.replace("uploaded", "parsed"),
    });
    expect(deleteObjectMock).toHaveBeenCalledTimes(1);
    expect(deleteObjectMock).toHaveBeenCalledWith({
      Bucket: bucketName,
      Key: objectKey,
    });

  });

  test("should handle S3 getObject error", async () => {
    getObjectMock.mockImplementationOnce(() => {
      throw new Error("S3 getObject failed");
    });


    await expect(handler(mockEvent, {} as any, () => {})).rejects.toThrow("S3 getObject failed");

    expect(getObjectMock).toHaveBeenCalledTimes(1);
    expect(copyObjectMock).not.toHaveBeenCalled();
    expect(deleteObjectMock).not.toHaveBeenCalled();

  });

  test("should throw error when no records in event", async () => {
    const mockEvent = { Records: [] } as any;

    await expect(handler(mockEvent, {} as any, () => {})).rejects.toThrow("No records found in the event");
  });
});
