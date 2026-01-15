/**
 * Automated Test Runner for LiS Operations Assistant
 * 
 * Usage:
 *   npx ts-node tests/run-tests.ts [options]
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

// Types
interface TestQuestion {
  id: string
  input: string
  expectContains?: string[]
  expectNotContains?: string[]
}

interface TestCategory {
  description: string
  questions: TestQuestion[]
}

interface TestData {
  metadata: { version: string; description: string }
  categories: Record<string, TestCategory>
}

interface TestResult {
  id: string
  input: string
  passed: boolean
  duration: number
  response?: string
  errors: string[]
}

// Configuration
const DEFAULT_URL = 'http://localhost:3000'
const TIMEOUT_MS = 60000

// Parse command line arguments
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      args[key] = value || 'true'
    }
  })
  return args
}

// Load test data
function loadTestData(): TestData {
  const filePath = path.join(__dirname, 'test-questions.json')
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

// Send chat request
async function sendChatRequest(
  baseUrl: string,
  message: string
): Promise<{ success: boolean; response: string; error?: string }> {
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
      }),
    })

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
            if (data.type === 'content' && data.content) {
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
    return {
      success: false,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Run a single test
async function runTest(
  baseUrl: string,
  test: TestQuestion,
  verbose: boolean
): Promise<TestResult> {
  const startTime = Date.now()
  const errors: string[] = []

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

  const result: TestResult = {
    id: test.id,
    input: test.input,
    passed: errors.length === 0,
    duration,
    errors,
  }

  if (verbose) {
    result.response = response.slice(0, 500) + (response.length > 500 ? '...' : '')
  }

  return result
}

// Print results
function printResults(results: TestResult[], verbose: boolean): void {
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
      if (verbose && result.response) {
        console.log(`   Response: ${result.response}`)
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
async function main(): Promise<void> {
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
  const testsToRun: { category: string; test: TestQuestion }[] = []

  for (const [categoryName, category] of Object.entries(testData.categories)) {
    if (categoryFilter && categoryName !== categoryFilter) continue

    for (const test of category.questions) {
      if (idFilter && test.id !== idFilter) continue
      testsToRun.push({ category: categoryName, test })
    }
  }

  console.log(`🎯 Running ${testsToRun.length} tests...\n`)

  // Run tests
  const results: TestResult[] = []

  for (let i = 0; i < testsToRun.length; i += parallel) {
    const batch = testsToRun.slice(i, i + parallel)
    const batchResults = await Promise.all(
      batch.map(async ({ category, test }) => {
        const icon = '🔄'
        process.stdout.write(`${icon} [${test.id}] ${test.input.slice(0, 40)}...`)
        const result = await runTest(baseUrl, test, verbose)
        process.stdout.write(`\r${result.passed ? '✅' : '❌'} [${test.id}] ${test.input.slice(0, 40)}... (${result.duration}ms)\n`)
        return result
      })
    )
    results.push(...batchResults)
  }

  // Print results
  printResults(results, verbose)

  // Exit with appropriate code
  const failed = results.filter(r => !r.passed).length
  process.exit(failed > 0 ? 1 : 0)
}

// Run
main().catch(console.error)

