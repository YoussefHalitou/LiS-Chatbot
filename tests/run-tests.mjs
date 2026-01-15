/**
 * Automated Test Runner for LiS Operations Assistant
 * 
 * Usage:
 *   node tests/run-tests.mjs [options]
 * 
 * Options:
 *   --category=projekte    Run only specific category
 *   --id=P001              Run only specific test
 *   --url=http://...       Custom API URL (default: localhost:3000)
 *   --verbose              Show full responses
 *   --parallel=5           Run N tests in parallel
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_URL = 'http://localhost:3000'

// Parse command line arguments
function parseArgs() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      args[key] = value || 'true'
    }
  })
  return args
}

// Load test data
function loadTestData() {
  const filePath = path.join(__dirname, 'test-questions.json')
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

// Send chat request
async function sendChatRequest(baseUrl, message) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return {
        success: false,
        response: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    // Handle SSE streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      return { success: false, response: '', error: 'No response body' }
    }

    let fullResponse = ''
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            // API sends 'token' type for content chunks
            if (data.type === 'token' && data.content) {
              fullResponse += data.content
            } else if (data.type === 'error') {
              return { success: false, response: '', error: data.message }
            }
          } catch {
            // Ignore JSON parse errors for partial chunks
          }
        }
      }
    }

    return { success: true, response: fullResponse }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, response: '', error: 'Request timeout (60s)' }
    }
    return {
      success: false,
      response: '',
      error: error.message || 'Unknown error',
    }
  }
}

// Run a single test
async function runTest(baseUrl, test, verbose) {
  const startTime = Date.now()
  const errors = []

  const { success, response, error } = await sendChatRequest(baseUrl, test.input)
  const duration = Date.now() - startTime

  if (!success) {
    errors.push(`Request failed: ${error}`)
    return { id: test.id, input: test.input, passed: false, duration, errors }
  }

  // Check expectContains
  if (test.expectContains) {
    for (const expected of test.expectContains) {
      if (!response.toLowerCase().includes(expected.toLowerCase())) {
        errors.push(`Expected "${expected}" not found in response`)
      }
    }
  }

  // Check expectNotContains
  if (test.expectNotContains) {
    for (const notExpected of test.expectNotContains) {
      if (response.toLowerCase().includes(notExpected.toLowerCase())) {
        errors.push(`Unexpected "${notExpected}" found in response`)
      }
    }
  }

  const result = {
    id: test.id,
    input: test.input,
    passed: errors.length === 0,
    duration,
    errors,
  }

  if (verbose) {
    result.response = response.slice(0, 1000) + (response.length > 1000 ? '...' : '')
    result.responseLength = response.length
  }

  return result
}

// Print results
function printResults(results, verbose) {
  console.log('\n' + '='.repeat(60))
  console.log('TEST RESULTS')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  // Summary
  console.log(`\n📊 Summary:`)
  console.log(`   Total: ${results.length}`)
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log(`   📈 Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`)

  // Failed tests details
  if (failed > 0) {
    console.log('\n❌ Failed Tests:')
    console.log('-'.repeat(60))
    for (const result of results.filter(r => !r.passed)) {
      console.log(`\n[${result.id}] "${result.input}"`)
      console.log(`   Duration: ${result.duration}ms`)
      for (const error of result.errors) {
        console.log(`   ⚠️  ${error}`)
      }
      if (verbose) {
        console.log(`   Response (${result.responseLength || 0} chars): ${result.response || '(empty)'}`)
      }
    }
  }

  // Passed tests (if verbose)
  if (verbose && passed > 0) {
    console.log('\n✅ Passed Tests:')
    console.log('-'.repeat(60))
    for (const result of results.filter(r => r.passed)) {
      console.log(`[${result.id}] "${result.input}" (${result.duration}ms)`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

// Main function
async function main() {
  const args = parseArgs()
  const baseUrl = args.url || DEFAULT_URL
  const verbose = args.verbose === 'true'
  const categoryFilter = args.category
  const idFilter = args.id
  const parallel = parseInt(args.parallel || '1', 10)

  console.log('🧪 LiS Operations Assistant - Automated Test Runner')
  console.log('='.repeat(60))
  console.log(`🌐 API URL: ${baseUrl}`)
  console.log(`📁 Category: ${categoryFilter || 'all'}`)
  console.log(`🔢 Test ID: ${idFilter || 'all'}`)
  console.log(`⚡ Parallel: ${parallel}`)
  console.log(`📝 Verbose: ${verbose}`)

  // Load test data
  const testData = loadTestData()
  console.log(`\n📋 Loaded ${Object.keys(testData.categories).length} categories`)

  // Collect tests to run
  const testsToRun = []

  for (const [categoryName, category] of Object.entries(testData.categories)) {
    if (categoryFilter && categoryName !== categoryFilter) continue

    for (const test of category.questions) {
      // Support comma-separated IDs
      if (idFilter) {
        const ids = idFilter.split(',').map(id => id.trim())
        if (!ids.includes(test.id)) continue
      }
      testsToRun.push({ category: categoryName, test })
    }
  }

  console.log(`🎯 Running ${testsToRun.length} tests...\n`)

  // Run tests
  const results = []

  for (let i = 0; i < testsToRun.length; i += parallel) {
    const batch = testsToRun.slice(i, i + parallel)
    const batchResults = await Promise.all(
      batch.map(async ({ category, test }) => {
        process.stdout.write(`🔄 [${test.id}] ${test.input.slice(0, 40)}...`)
        const result = await runTest(baseUrl, test, verbose)
        process.stdout.write(`\r${result.passed ? '✅' : '❌'} [${test.id}] ${test.input.slice(0, 40)}... (${result.duration}ms)\n`)
        return result
      })
    )
    results.push(...batchResults)
  }

  // Print results
  printResults(results, verbose)

  // Save results to JSON if --save flag is provided
  if (args.save) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputPath = path.join(__dirname, `test-results-${timestamp}.json`)
    const output = {
      timestamp: new Date().toISOString(),
      config: { baseUrl, verbose, categoryFilter, idFilter, parallel },
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
        passRate: ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1) + '%'
      },
      results
    }
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
    console.log(`\n📄 Results saved to: ${outputPath}`)
  }

  // Exit with appropriate code
  const failedCount = results.filter(r => !r.passed).length
  process.exit(failedCount > 0 ? 1 : 0)
}

// Run
main().catch(console.error)

