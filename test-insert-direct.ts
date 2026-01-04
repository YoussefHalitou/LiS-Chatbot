/**
 * Direct test script to debug insertRow for t_projects
 * Run with: npx tsx test-insert-direct.ts
 */

// Load environment variables manually
function loadEnvFile() {
  const fs = require('fs')
  const path = require('path')
  
  const envPath = path.join(__dirname, '.env.local')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value.trim()
        }
      }
    }
  }
}

// Load env before importing
loadEnvFile()

// Now import
import { insertRow } from './lib/supabase-query'

async function testInsert() {
  console.log('Testing insertRow for t_projects...\n')
  
  // Test data
  const testData = {
    name: 'TestDirectInsert',
    stadt: 'Berlin',
    status: 'In Planung',
    project_code: `PRJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  }
  
  console.log('Test data:', JSON.stringify(testData, null, 2))
  console.log('\nCalling insertRow...\n')
  
  const result = await insertRow('t_projects', testData)
  
  console.log('Result:', JSON.stringify(result, null, 2))
  
  if (result.error) {
    console.error('\n❌ ERROR:', result.error)
  } else {
    console.log('\n✅ SUCCESS:', result.data)
  }
}

testInsert().catch(console.error)
