/**
 * Test script for Supabase insert functionality
 * Tests creating entries in various tables
 * 
 * Usage:
 *   npx tsx test-insert-functionality.ts
 * 
 * The script will automatically load .env.local if it exists.
 * 
 * IMPORTANT: Environment variables must be loaded BEFORE any imports
 * that use supabase.ts, as that module initializes on import.
 */

// Load environment variables FIRST, before any other imports
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local file manually
function loadEnvFile() {
  const envPaths = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env')
  ]
  
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf-8')
        const lines = content.split('\n')
        
        for (const line of lines) {
          // Skip comments and empty lines
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          
          // Parse KEY=VALUE format
          const match = trimmed.match(/^([^=]+)=(.*)$/)
          if (match) {
            const key = match[1].trim()
            let value = match[2].trim()
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            
            // Only set if not already set (environment variables take precedence)
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        }
        
        console.log(`✅ Loaded environment variables from ${envPath}`)
        
        // Debug: Show which variables were loaded (without showing values)
        const loadedKeys = Object.keys(process.env).filter(key => 
          key.includes('SUPABASE') || key.includes('OPENAI')
        )
        console.log(`   Loaded keys: ${loadedKeys.join(', ')}`)
        
        return true
      } catch (error) {
        console.warn(`⚠️  Could not load ${envPath}:`, error instanceof Error ? error.message : error)
      }
    }
  }
  
  return false
}

// Load environment variables IMMEDIATELY, before ANY imports
// This must happen before supabase.ts is imported (which happens when we import supabase-query)
loadEnvFile()

// Verify variables are set
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error('\n❌ Environment variables not loaded properly!')
  console.error(`   URL: ${url ? '✅' : '❌'}`)
  console.error(`   Anon Key: ${anonKey ? '✅' : '❌'}`)
  console.error(`   Service Key: ${serviceKey ? '✅' : '❌'}`)
  console.error('\n💡 The .env.local file exists but variables were not loaded.')
  console.error('   This might be a parsing issue. Please check the file format.\n')
  process.exit(1)
}

// Check for required environment variables BEFORE importing supabase modules
function checkEnvironmentVariables() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('\n❌ Fehlende Umgebungsvariablen:')
    missing.forEach(key => {
      const hasValue = !!process.env[key]
      const valuePreview = process.env[key] ? `${process.env[key]?.substring(0, 20)}...` : 'undefined'
      console.error(`   - ${key}: ${hasValue ? '✅' : '❌'} (${valuePreview})`)
    })
    console.error('\n💡 Lösung:')
    console.error('   1. Überprüfe, ob die .env.local Datei die richtigen Variablennamen hat')
    console.error('   2. Oder setze die Variablen direkt beim Aufruf:')
    console.error('      NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx test-insert-functionality.ts')
    console.error('\n   3. Oder starte den Next.js Server (lädt .env.local automatisch):')
    console.error('      npm run dev')
    console.error('      Dann teste über die Chat-API im Browser\n')
    return false
  }
  
  return true
}

// Debug: Show environment variables before check
console.log('\n🔍 Environment variables check:')
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`)

// Check BEFORE importing (supabase.ts initializes on import)
if (!checkEnvironmentVariables()) {
  process.exit(1)
}

// Import supabaseAdmin directly to check if it's initialized
import { supabaseAdmin } from './lib/supabase'
import { insertRow, queryTable, deleteRow } from './lib/supabase-query'

// Check if supabaseAdmin was initialized correctly
// The warning from supabase.ts is expected during import, but we need to verify
// that supabaseAdmin is actually initialized after we set the variables
if (!supabaseAdmin) {
  console.error('\n⚠️  WARNING: supabaseAdmin is null even after loading environment variables!')
  console.error('   This means supabase.ts was initialized BEFORE the variables were set.')
  console.error('   The tests will fail, but this is expected behavior.')
  console.error('   To fix this, you need to set environment variables BEFORE running the script:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx test-insert-functionality.ts\n')
} else {
  console.log('✅ supabaseAdmin initialized successfully\n')
}

// Test data for different tables
const testData = {
  t_projects: {
    name: 'TEST_PROJECT_INSERT',
    status: 'In Planung',
    stadt: 'Köln',
    dienstleistungen: 'Umzug',
  },
  t_employees: {
    name: 'TEST_EMPLOYEE_INSERT',
    is_active: true,
    hourly_rate: 25,
    contract_type: 'Intern',
  },
  t_materials: {
    name: 'TEST_MATERIAL_INSERT',
    is_active: true,
    vat_rate: 19,
    default_quantity: 1,
    material_id: `M-TEST-${Date.now()}`,
  },
  t_vehicles: {
    vehicle_id: `TEST-VEHICLE-${Date.now()}`,
    nickname: 'TEST_VEHICLE_INSERT',
    unit: 'Tag',
    status: 'bereit',
  },
}

// Cleanup function to remove test data
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...\n')
  
  try {
    // Delete test projects
    const projects = await queryTable('t_projects', { name: 'TEST_PROJECT_INSERT' })
    if (projects.data && projects.data.length > 0) {
      for (const project of projects.data) {
        await deleteRow('t_projects', { project_id: project.project_id })
        console.log(`✅ Deleted test project: ${project.project_id}`)
      }
    }

    // Delete test employees
    const employees = await queryTable('t_employees', { name: 'TEST_EMPLOYEE_INSERT' })
    if (employees.data && employees.data.length > 0) {
      for (const employee of employees.data) {
        await deleteRow('t_employees', { employee_id: employee.employee_id })
        console.log(`✅ Deleted test employee: ${employee.employee_id}`)
      }
    }

    // Delete test materials
    const materials = await queryTable('t_materials', { name: 'TEST_MATERIAL_INSERT' })
    if (materials.data && materials.data.length > 0) {
      for (const material of materials.data) {
        await deleteRow('t_materials', { material_id: material.material_id })
        console.log(`✅ Deleted test material: ${material.material_id}`)
      }
    }

    // Delete test vehicles
    const vehicles = await queryTable('t_vehicles', { nickname: 'TEST_VEHICLE_INSERT' })
    if (vehicles.data && vehicles.data.length > 0) {
      for (const vehicle of vehicles.data) {
        await deleteRow('t_vehicles', { vehicle_id: vehicle.vehicle_id })
        console.log(`✅ Deleted test vehicle: ${vehicle.vehicle_id}`)
      }
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Test insert functionality
async function testInsertFunctionality() {
  console.log('🧪 Testing Supabase Insert Functionality\n')
  console.log('=' .repeat(60))

  const results: Array<{ table: string; success: boolean; error?: string; data?: any }> = []

  // Test 1: Insert into t_projects
  console.log('\n📝 Test 1: Insert into t_projects')
  try {
    const result = await insertRow('t_projects', testData.t_projects)
    if (result.error) {
      console.log(`❌ Failed: ${result.error}`)
      results.push({ table: 't_projects', success: false, error: result.error })
    } else {
      console.log(`✅ Success! Created project with ID: ${result.data?.project_id}`)
      console.log(`   Data:`, JSON.stringify(result.data, null, 2))
      results.push({ table: 't_projects', success: true, data: result.data })
    }
  } catch (error) {
    console.log(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({ table: 't_projects', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  // Test 2: Insert into t_employees
  console.log('\n👤 Test 2: Insert into t_employees')
  try {
    const result = await insertRow('t_employees', testData.t_employees)
    if (result.error) {
      console.log(`❌ Failed: ${result.error}`)
      results.push({ table: 't_employees', success: false, error: result.error })
    } else {
      console.log(`✅ Success! Created employee with ID: ${result.data?.employee_id}`)
      console.log(`   Data:`, JSON.stringify(result.data, null, 2))
      results.push({ table: 't_employees', success: true, data: result.data })
    }
  } catch (error) {
    console.log(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({ table: 't_employees', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  // Test 3: Insert into t_materials
  console.log('\n📦 Test 3: Insert into t_materials')
  try {
    const result = await insertRow('t_materials', testData.t_materials)
    if (result.error) {
      console.log(`❌ Failed: ${result.error}`)
      results.push({ table: 't_materials', success: false, error: result.error })
    } else {
      console.log(`✅ Success! Created material with ID: ${result.data?.material_id}`)
      console.log(`   Data:`, JSON.stringify(result.data, null, 2))
      results.push({ table: 't_materials', success: true, data: result.data })
    }
  } catch (error) {
    console.log(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({ table: 't_materials', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  // Test 4: Insert into t_vehicles
  console.log('\n🚗 Test 4: Insert into t_vehicles')
  try {
    const result = await insertRow('t_vehicles', testData.t_vehicles)
    if (result.error) {
      console.log(`❌ Failed: ${result.error}`)
      results.push({ table: 't_vehicles', success: false, error: result.error })
    } else {
      console.log(`✅ Success! Created vehicle with ID: ${result.data?.vehicle_id}`)
      console.log(`   Data:`, JSON.stringify(result.data, null, 2))
      results.push({ table: 't_vehicles', success: true, data: result.data })
    }
  } catch (error) {
    console.log(`❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({ table: 't_vehicles', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  // Test 5: Try to insert into disallowed table (should fail)
  console.log('\n🚫 Test 5: Insert into disallowed table (t_inspections)')
  try {
    const result = await insertRow('t_inspections', { customer_name: 'Test' })
    if (result.error) {
      console.log(`✅ Correctly rejected: ${result.error}`)
      results.push({ table: 't_inspections', success: false, error: result.error })
    } else {
      console.log(`❌ Should have failed but didn't!`)
      results.push({ table: 't_inspections', success: false, error: 'Should have been rejected' })
    }
  } catch (error) {
    console.log(`✅ Correctly threw exception: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({ table: 't_inspections', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }

  // Test 6: Verify inserted data by querying
  console.log('\n🔍 Test 6: Verify inserted data by querying')
  try {
    const projects = await queryTable('t_projects', { name: 'TEST_PROJECT_INSERT' })
    if (projects.data && projects.data.length > 0) {
      console.log(`✅ Found ${projects.data.length} test project(s) in database`)
    } else {
      console.log(`⚠️  No test projects found (might have been cleaned up)`)
    }

    const employees = await queryTable('t_employees', { name: 'TEST_EMPLOYEE_INSERT' })
    if (employees.data && employees.data.length > 0) {
      console.log(`✅ Found ${employees.data.length} test employee(s) in database`)
    } else {
      console.log(`⚠️  No test employees found (might have been cleaned up)`)
    }
  } catch (error) {
    console.log(`❌ Error verifying data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Test Summary:')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} Test ${index + 1}: ${result.table}${result.error ? ` - ${result.error}` : ''}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('='.repeat(60))

  return results
}

// Main execution
async function main() {
  try {
    // Run tests (insertRow, queryTable, deleteRow are now available from dynamic import)
    const results = await testInsertFunctionality()
    
    // Cleanup
    await cleanupTestData()
    
    // Exit with appropriate code
    const allSuccessful = results.filter(r => !r.table.includes('disallowed')).every(r => r.success)
    process.exit(allSuccessful ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    await cleanupTestData()
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { testInsertFunctionality, cleanupTestData }
