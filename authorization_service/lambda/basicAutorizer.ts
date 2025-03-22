import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  Callback,
} from "aws-lambda";



export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context,
  callback: Callback<APIGatewayAuthorizerResult>
): Promise<void> => {
  if (event.type !== "TOKEN") {
    callback("Unauthorized");
    return;
  }

  try {
    const authorizationToken = event.authorizationToken;
    if (!authorizationToken) {
      callback("Unauthorized");
      return;
    }

    const encodedCredentials = authorizationToken.split(" ")[1];
    const buffer = Buffer.from(encodedCredentials, "base64");
    const [username, password] = buffer.toString("utf-8").split(":");

    console.log(`username: ${username}, password: ${password}`);

    const validPassword = process.env[username];

    const effect =
      !validPassword || validPassword !== password ? "Deny" : "Allow";
    
    console.log(`effect: ${effect}`);

    const policy = generatePolicy(encodedCredentials, event.methodArn, effect);
    callback(null, policy);
  } catch (error) {
    callback("Unauthorized");
  }
};

const generatePolicy = (
  principalId: string,
  resource: string,
  effect: "Deny" | "Allow"
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};
