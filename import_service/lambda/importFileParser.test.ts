import { S3Event } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { Transform } from 'stream';
import { handler } from './importFileParser';

// Mock the entire aws-sdk
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn().mockImplementation(() => ({
      getObject: jest.fn().mockImplementation(() => ({
        createReadStream: jest.fn()
      }))
    }))
  };
});

describe('importFileParser Lambda', () => {
  let s3Instance: S3;
  
  beforeEach(() => {
    jest.clearAllMocks();
    s3Instance = new S3();
  });

  // Helper function to create a mock CSV stream
  const createMockCsvStream = (data: any[]) => {
    const mockStream = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk);
      }
    });

    // Add a small delay before pushing data to simulate real streaming
    process.nextTick(() => {
      // Push CSV header
      mockStream.push('title,description\n');
      
      // Push each data row
      data.forEach(item => {
        mockStream.push(`${item.title},${item.description}\n`);
      });
      
      mockStream.push(null); // End the stream
    });

    // Add pipe method if it doesn't exist
    if (!mockStream.pipe) {
      mockStream.pipe = jest.fn().mockReturnValue(mockStream);
    }

    return mockStream;
  };

  const mockEvent: S3Event = {
    Records: [
      {
        s3: {
          bucket: {
            name: 'test-bucket'
          },
          object: {
            key: 'test-file.csv'
          }
        }
      }
    ]
  } as any;

  test('should process CSV file successfully', async () => {
    const mockData = [
      { title: 'Product1', description: 'Description1' },
      { title: 'Product2', description: 'Description2' }
    ];

    const mockStream = createMockCsvStream(mockData);
    (s3Instance.getObject as jest.Mock).mockReturnValue({
      createReadStream: () => mockStream,
      pipe: jest.fn().mockReturnValue(mockStream)
    });

    const consoleSpy = jest.spyOn(console, 'log');

    await handler(mockEvent, {} as any, () => {});

    expect(s3Instance.getObject).toHaveBeenCalledWith({
      Bucket: 'XXXXXXXXXXX',
      Key: 'test-file.csv'
    });

    // Verify each record was logged
    mockData.forEach(item => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Parsed record:',
        JSON.stringify(item)
      );
    });
  });

});
