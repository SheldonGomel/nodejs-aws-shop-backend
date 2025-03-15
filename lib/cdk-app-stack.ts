import {
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

const bundling = {
  forceDockerBundling: false, // Disable Docker bundling
};

const lambdaParams = {
  runtime: Runtime.NODEJS_22_X,
  handler: "handler",
  memorySize: 128,
  timeout: Duration.seconds(30),
  bundling,
};

const productsOptions = {
  ...lambdaParams,
  environment: {
    PRODUCTS_TABLE_NAME: "ProductsTable",
    STOCKS_TABLE_NAME: "StocksTable",
  },
};

const importOptions = {
  ...lambdaParams,
  environment: {
    BUCKET_NAME: "aws-rss-backend",
  },
};

export class MyLambdaProjectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, "ProductsTable", {
      tableName: "ProductsTable",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN, // RETAIN to keep the table when stack is deleted, or DESTROY to remove it
    });

    const stocksTable = new dynamodb.Table(this, "StocksTable", {
      tableName: "StocksTable",
      partitionKey: { name: "product_id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Create Lambda function for getting products list
    const getProductsList = new NodejsFunction(this, "GetProductsList", {
      entry: "product_service/lambda/getProductsList.ts",
      functionName: "get-products-list",
      ...productsOptions,
    });
    productsTable.grantReadWriteData(getProductsList);
    stocksTable.grantReadWriteData(getProductsList);

    // Create Lambda function for getting product by ID
    const getProductsById = new NodejsFunction(this, "GetProductsById", {
      entry: "product_service/lambda/getProductsById.ts",
      functionName: "get-product-by-id",
      ...productsOptions,
    });
    productsTable.grantReadWriteData(getProductsById);
    stocksTable.grantReadWriteData(getProductsById);

    // Create Lambda function for creating a new product
    const createProduct = new NodejsFunction(this, "CreateProduct", {
      entry: "product_service/lambda/createProduct.ts",
      functionName: "create-product",
      ...productsOptions,
    });
    productsTable.grantReadWriteData(createProduct);
    stocksTable.grantReadWriteData(createProduct);

    // Create Lambda function for catalog batch process
    const catalogBatchProcess = new NodejsFunction(
      this,
      "CatalogBatchProcess",
      {
        entry: "product_service/lambda/catalogBatchProcess.ts",
        functionName: "catalog-batch-process",
        ...productsOptions,
      }
    );
    productsTable.grantReadWriteData(catalogBatchProcess);
    stocksTable.grantReadWriteData(catalogBatchProcess);

    // Create SQS queue for catalog items
    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: Duration.seconds(30),
      retentionPeriod: Duration.days(14),
    });

    // Grant SQS permissions to the Lambda function
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess);

    // Add SQS as event source for catalogBatchProcess Lambda
    catalogBatchProcess.addEventSource(
      new SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    // Create API Gateway
    const api = new RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      deploy: true,
      deployOptions: {
        stageName: "dev",
      },
    });

    // Add products resource
    const productsResource = api.root.addResource("products");

    // GET /products
    productsResource.addMethod("GET", new LambdaIntegration(getProductsList));

    // GET /products/{id}
    const productById = productsResource.addResource("{id}");
    productById.addMethod("GET", new LambdaIntegration(getProductsById));

    // POST /products
    productsResource.addMethod("POST", new LambdaIntegration(createProduct));

    // Output the API URL
    new CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    // Output the SQS arn
    new CfnOutput(this, "SQSArn", {
      value: catalogItemsQueue.queueArn,
      description: "SQS Queue ARN",
    });
  }
}

export class ImportServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    const bucket = new s3.Bucket(this, "ImportBucket", {
      bucketName: "aws-rss-backend",
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Create Lambda function for importing products file
    const importProductsFile = new NodejsFunction(this, "ImportProductsFile", {
      functionName: "import-products-file",
      entry: "import_service/lambda/importProductsFile.ts",
      ...importOptions,
    });
    bucket.grantPut(importProductsFile);
    bucket.grantRead(importProductsFile);

    const queue = sqs.Queue.fromQueueArn(this, "ImportQueue", "arn:aws:sqs:eu-west-1:891377365177:catalogItemsQueue");

    // Create Lambda function for parsing imported products file
    const importFileParser = new NodejsFunction(this, "ImportFileParser", {
      functionName: "import-file-parser",
      entry: "import_service/lambda/importFileParser.ts",
      ...lambdaParams,
      environment: {
        SQS_URL: queue.queueUrl,
      },
    });
    bucket.grantReadWrite(importFileParser);
    bucket.grantDelete(importFileParser);
    queue.grantSendMessages(importFileParser);

    // Add S3 event notification for the importFileParser Lambda
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      // Only trigger for objects in the 'uploaded/' prefix
      { prefix: "uploaded/" }
    );


    // Create API Gateway
    const api = new RestApi(this, "ImportApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
    });

    // Create API resource and method
    const importResource = api.root.addResource("import");

    importResource.addMethod("GET", new LambdaIntegration(importProductsFile), {
      requestParameters: {
        "method.request.querystring.name": true, // Make name parameter required
      },
      requestValidatorOptions: {
        validateRequestParameters: true,
      },
    });

    // Add additional IAM policy for S3 presigned URL generation
    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [`${bucket.bucketArn}/*`],
      })
    );
  }
}
