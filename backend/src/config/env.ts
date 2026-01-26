export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  databaseUrl: process.env.DATABASE_URL || 'mysql://hellio:helliopassword@localhost:3306/hellio_hr',
  llm: {
    provider: (process.env.LLM_PROVIDER || 'mock') as 'mock' | 'bedrock',
    defaultModel: process.env.LLM_DEFAULT_MODEL || 'amazon.nova-lite-v1:0',
    alternativeModel: process.env.LLM_ALTERNATIVE_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    region: process.env.AWS_REGION || 'us-east-1',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  },
};
