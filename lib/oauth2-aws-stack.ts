import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AccountRecovery, OAuthScope, ResourceServerScope, UserPool, UserPoolClient, UserPoolResourceServer, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

const domainPrefix = "marcio-oauth2-userpool";
const resourceServer = "marcio-oauth2-resource-server";

export class Oauth2AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, "CognitoUserPool", {
      userPoolName: "marcio-oauth2-userpool",
      removalPolicy: RemovalPolicy.DESTROY,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true
        }
      }
    })
    userPool.addDomain("CognitoDomainName", {
      cognitoDomain: {
        domainPrefix: domainPrefix
      }
    })

    const userReadResourceServerScope = new ResourceServerScope({
      scopeName: "user.read",
      scopeDescription: "user read scope"
    })
    const userWriteResourceServerScope = new ResourceServerScope({
      scopeName: "user.write",
      scopeDescription: "user write scope"
    })
    const userPoolResourceServer = new UserPoolResourceServer(this, "CognitoResourceServer", {
      identifier: resourceServer,
      userPool: userPool,
      scopes: [userReadResourceServerScope, userWriteResourceServerScope]
    })

    const appclient = new UserPoolClient(this, "CognitoUserPoolClient", {
      userPool: userPool,
      accessTokenValidity: Duration.minutes(60),
      generateSecret: true,
      refreshTokenValidity: Duration.days(1),
      enableTokenRevocation: true,
      oAuth: {
        flows: {
          clientCredentials: true
        },
        scopes: [
          OAuthScope.resourceServer(userPoolResourceServer, userReadResourceServerScope),
          OAuthScope.resourceServer(userPoolResourceServer, userWriteResourceServerScope),
        ]
      }
    })

    new CfnOutput(this, "client-id", {
      exportName: "client-id",
      value: appclient.userPoolClientId
    })

    new CfnOutput(this, "client-secret", {
      exportName: "client-secret",
      value: appclient.userPoolClientSecret.unsafeUnwrap()
    })

    new CfnOutput(this, "scope-read", {
      exportName: "scope-read",
      value: `${resourceServer}/user.read`
    })

    new CfnOutput(this, "scope-write", {
      exportName: "scope-write",
      value: `${resourceServer}/user.write`
    })

    new CfnOutput(this, "grant-type", {
      exportName: "grant-type",
      value: "client_credentials"
    })

    new CfnOutput(this, "url", {
      exportName: "cognito-oauth2-url",
      value: `https://${domainPrefix}.auth.${process.env.CDK_DEFAULT_REGION}.amazoncognito.com/oauth2/token`
    })
  }
}
