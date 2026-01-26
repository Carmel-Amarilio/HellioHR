/**
 * Test script to verify AWS Bedrock integration
 *
 * Usage:
 *   npm run test-bedrock
 *
 * Or manually:
 *   tsx scripts/test-bedrock.ts
 */

// Load environment variables from .env file
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, '../.env') });

import { BedrockLLMClient } from '../src/services/llm/BedrockLLMClient.js';
import { LLMClientConfig } from '../src/services/llm/LLMClient.js';
import { config } from '../src/config/env.js';

async function testBedrock() {
  console.log('🔍 Testing AWS Bedrock Integration...\n');

  // Check environment variables
  console.log('📋 Configuration:');
  console.log(`   Provider: ${config.llm.provider}`);
  console.log(`   Model: ${config.llm.defaultModel}`);
  console.log(`   Region: ${config.llm.region}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log();

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found in environment variables.');
    console.error('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env');
    console.error('   See AWS_BEDROCK_SETUP.md for instructions.\n');
    process.exit(1);
  }

  // Create Bedrock client
  const clientConfig: LLMClientConfig = {
    provider: 'bedrock',
    model: config.llm.defaultModel,
    region: config.llm.region,
    maxTokens: config.llm.maxTokens,
    temperature: config.llm.temperature,
  };

  const client = new BedrockLLMClient(clientConfig);

  // Test 1: Simple prompt
  console.log('🧪 Test 1: Simple JSON extraction');
  console.log('   Prompt: Extract name and skills from CV text');
  console.log();

  const simplePrompt = `Extract the following information from this CV text and return as JSON:

CV Text:
John Doe
Software Engineer
Skills: JavaScript, Python, React, Node.js
Email: john.doe@example.com

Return JSON with: { "name": "...", "skills": [...], "email": "..." }`;

  try {
    const response1 = await client.generate({
      systemPrompt: 'You are a CV parser. Return only valid JSON.',
      prompt: simplePrompt,
    });

    console.log('✅ Test 1 Passed!');
    console.log(`   Response: ${response1.text.substring(0, 100)}...`);
    console.log(`   Tokens: ${response1.usage.totalTokens} (${response1.usage.promptTokens} in / ${response1.usage.completionTokens} out)`);
    console.log(`   Latency: ${response1.latencyMs}ms`);
    console.log(`   Cost: $${client.getCostEstimate(response1.usage).toFixed(6)}`);
    console.log();

    // Verify JSON is valid
    try {
      JSON.parse(response1.text);
      console.log('✅ Response is valid JSON');
    } catch (e) {
      console.warn('⚠️  Response is not valid JSON (may need prompt tuning)');
    }
  } catch (error) {
    console.error('❌ Test 1 Failed!');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  // Test 2: Real CV extraction
  console.log('🧪 Test 2: Full CV extraction');
  console.log('   Using CV_EXTRACTION prompt template');
  console.log();

  const cvText = `ALICE JOHNSON
Frontend Developer
Email: alice.johnson@email.com | Phone: +1-555-0101

SUMMARY
Passionate frontend developer with 5+ years of experience building modern web applications.
Specialized in React, TypeScript, and creating intuitive user interfaces.

SKILLS
- Languages: JavaScript, TypeScript, HTML5, CSS3
- Frameworks: React, Next.js, Vue.js
- Tools: Git, Webpack, Vite, Jest, Cypress

EXPERIENCE

Senior Frontend Developer | TechCorp Inc. | 2021 - Present
- Led development of customer-facing dashboard serving 100K+ users
- Implemented design system reducing development time by 40%
- Mentored junior developers and conducted code reviews

Frontend Developer | StartupXYZ | 2019 - 2021
- Built React components for e-commerce platform
- Improved page load performance by 60%
- Collaborated with UX team on responsive designs

EDUCATION
B.S. Computer Science | State University | 2019`;

  const cvPrompt = `Extract the following information from this CV:

1. summary: A brief professional summary (2-3 sentences)
2. experience: Array of work experience entries with:
   - company: Company name
   - role: Job title
   - duration: Time period
   - achievements: Array of key achievements
3. education: Array of education entries with:
   - degree: Degree or certification
   - institution: School/university name
   - year: Graduation year
4. skills: Array of technical skills

CV Text:
${cvText}

Return ONLY the JSON object, no additional text:`;

  try {
    const response2 = await client.generate({
      systemPrompt: 'You are an expert CV parser. Return ONLY valid JSON with no additional text.',
      prompt: cvPrompt,
    });

    console.log('✅ Test 2 Passed!');
    console.log(`   Tokens: ${response2.usage.totalTokens} (${response2.usage.promptTokens} in / ${response2.usage.completionTokens} out)`);
    console.log(`   Latency: ${response2.latencyMs}ms`);
    console.log(`   Cost: $${client.getCostEstimate(response2.usage).toFixed(6)}`);
    console.log();

    // Parse and display extracted data
    try {
      const extracted = JSON.parse(response2.text);
      console.log('📊 Extracted Data:');
      console.log(`   Summary: ${extracted.summary?.substring(0, 80)}...`);
      console.log(`   Experience entries: ${extracted.experience?.length ?? 0}`);
      console.log(`   Education entries: ${extracted.education?.length ?? 0}`);
      console.log(`   Skills: ${extracted.skills?.length ?? 0} items`);

      if (extracted.experience && extracted.experience.length > 0) {
        console.log(`   First job: ${extracted.experience[0].role} at ${extracted.experience[0].company}`);
      }
    } catch (e) {
      console.warn('⚠️  Could not parse response as JSON');
      console.log(`   Raw response: ${response2.text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error('❌ Test 2 Failed!');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(60) + '\n');
  console.log('🎉 All tests passed! AWS Bedrock integration is working.');
  console.log('💡 You can now set LLM_PROVIDER=bedrock in .env to use real LLM extraction.');
  console.log();
}

// Run tests
testBedrock().catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
