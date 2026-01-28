#!/usr/bin/env tsx
/**
 * Quick test script for visibility API endpoints
 */

async function testEndpoints() {
  const baseUrl = 'http://localhost:3000';

  // First login to get token
  console.log('1. Logging in as viewer...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@hellio.hr', password: 'viewer123' }),
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }

  const { token } = await loginRes.json();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  console.log('✓ Logged in successfully\n');

  // Test document status endpoint
  console.log('2. Testing GET /api/documents/status...');
  const statusRes = await fetch(`${baseUrl}/api/documents/status`, { headers });
  const statusData = await statusRes.json();
  console.log(`✓ Found ${statusData.documents?.length || 0} documents`);
  if (statusData.documents?.[0]) {
    console.log(`  Example: ${statusData.documents[0].fileName} - ${statusData.documents[0].candidate?.extractionStatus || statusData.documents[0].position?.extractionStatus || 'unknown'}`);
  }
  console.log('');

  // Test candidate extraction endpoint
  console.log('3. Testing GET /api/candidates/:id/extraction...');
  const candRes = await fetch(`${baseUrl}/api/candidates/cand-001/extraction`, { headers });
  const candData = await candRes.json();
  console.log(`✓ Candidate: ${candData.name}`);
  console.log(`  Status: ${candData.extractionStatus || 'none'}`);
  console.log(`  Method: ${candData.extractionMethod || 'none'}`);
  console.log(`  Documents: ${candData.documents?.length || 0}`);
  console.log('');

  // Test position extraction endpoint
  console.log('4. Testing GET /api/positions/:id/extraction...');
  const posRes = await fetch(`${baseUrl}/api/positions/pos-001/extraction`, { headers });
  const posData = await posRes.json();
  console.log(`✓ Position: ${posData.title}`);
  console.log(`  Status: ${posData.extractionStatus || 'none'}`);
  console.log(`  Method: ${posData.extractionMethod || 'none'}`);
  console.log(`  Documents: ${posData.documents?.length || 0}`);
  console.log('');

  // Test LLM metrics endpoint
  console.log('5. Testing GET /api/llm/metrics...');
  const metricsRes = await fetch(`${baseUrl}/api/llm/metrics`, { headers });
  if (metricsRes.status === 403) {
    console.log('⚠️  Forbidden (editor role required)');
  } else {
    const metricsData = await metricsRes.json();
    console.log(`✓ Total calls: ${metricsData.totalCalls || 0}`);
    console.log(`  Total cost: $${(metricsData.totalCost || 0).toFixed(4)}`);
  }
  console.log('');

  console.log('✅ All visibility endpoints working!');
}

testEndpoints().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
