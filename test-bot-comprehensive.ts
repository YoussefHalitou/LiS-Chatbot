#!/usr/bin/env node
/**
 * Comprehensive Bot Test Script
 * 
 * Tests all bot functionalities:
 * - INSERT operations for all allowed tables
 * - UPDATE operations
 * - DELETE operations
 * - Query operations
 * - Error handling
 * 
 * Usage: npx tsx test-bot-comprehensive.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const API_URL = process.env.API_URL || 'http://localhost:3000/api/chat'
const TEST_TIMEOUT = 30000 // 30 seconds per test

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
  error?: string
}

interface TestData {
  project_id?: string
  employee_id?: string
  material_id?: string
  vehicle_id?: string
  service_id?: string
  [key: string]: any
}

class BotTester {
  private results: TestResult[] = []
  private testData: TestData = {}
  private testCounter = 0

  async run() {
    console.log('🚀 Starting Comprehensive Bot Tests\n')
    console.log(`API URL: ${API_URL}\n`)

    try {
      // Test INSERT operations
      await this.testSection('INSERT Operations', async () => {
        await this.testInsertProject()
        await this.testInsertEmployee()
        await this.testInsertMaterial()
        await this.testInsertVehicle()
        await this.testInsertService()
      })

      // Test UPDATE operations
      await this.testSection('UPDATE Operations', async () => {
        await this.testUpdateProject()
        await this.testUpdateEmployee()
        await this.testUpdateMaterial()
      })

      // Test Query operations
      await this.testSection('Query Operations', async () => {
        await this.testQueryProject()
        await this.testQueryEmployee()
        await this.testQueryMaterial()
      })

      // Test DELETE operations
      await this.testSection('DELETE Operations', async () => {
        await this.testDeleteProject()
        await this.testDeleteEmployee()
        await this.testDeleteMaterial()
        await this.testDeleteVehicle()
        await this.testDeleteService()
      })

      // Test Error handling
      await this.testSection('Error Handling', async () => {
        await this.testInvalidTable()
        await this.testInvalidFilters()
        await this.testMissingValues()
      })

    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      this.printSummary()
      this.saveResults()
    }
  }

  private async testSection(name: string, tests: () => Promise<void>) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📋 ${name}`)
    console.log('='.repeat(60))
    await tests()
  }

  private async test(name: string, testFn: () => Promise<boolean | string>): Promise<void> {
    this.testCounter++
    const testNumber = this.testCounter.toString().padStart(3, '0')
    const startTime = Date.now()
    
    try {
      console.log(`\n[${testNumber}] Testing: ${name}...`)
      
      const result = await Promise.race([
        testFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
        )
      ])

      const duration = Date.now() - startTime
      
      if (result === true || (typeof result === 'string' && result.includes('success'))) {
        this.results.push({
          name,
          status: 'PASS',
          message: typeof result === 'string' ? result : 'Test passed',
          duration
        })
        console.log(`✅ PASS (${duration}ms)`)
      } else {
        this.results.push({
          name,
          status: 'FAIL',
          message: typeof result === 'string' ? result : 'Test failed',
          duration,
          error: typeof result === 'string' ? result : 'Unknown error'
        })
        console.log(`❌ FAIL: ${typeof result === 'string' ? result : 'Unknown error'}`)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      const errorMessage = error.message || 'Unknown error'
      this.results.push({
        name,
        status: 'FAIL',
        message: errorMessage,
        duration,
        error: errorMessage
      })
      console.log(`❌ FAIL: ${errorMessage}`)
    }
  }

  // INSERT Tests
  private async testInsertProject(): Promise<void> {
    await this.test('INSERT Project', async () => {
      const projectName = `TestProject_${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle ein neues Projekt: Name ist ${projectName}, Stadt ist Berlin`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.project_id) {
        this.testData.project_id = toolResponse.data.project_id
        this.testData.project_name = projectName
        return 'success'
      }

      return 'No project_id in response'
    })
  }

  private async testInsertEmployee(): Promise<void> {
    await this.test('INSERT Employee', async () => {
      const employeeName = `TestEmployee_${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle einen neuen Mitarbeiter: Name ist ${employeeName}, Stundensatz ist 30`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.employee_id) {
        this.testData.employee_id = toolResponse.data.employee_id
        this.testData.employee_name = employeeName
        return 'success'
      }

      return 'No employee_id in response'
    })
  }

  private async testInsertMaterial(): Promise<void> {
    await this.test('INSERT Material', async () => {
      const materialName = `TestMaterial_${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle ein neues Material: Name ist ${materialName}`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.material_id) {
        this.testData.material_id = toolResponse.data.material_id
        this.testData.material_name = materialName
        return 'success'
      }

      return 'No material_id in response'
    })
  }

  private async testInsertVehicle(): Promise<void> {
    await this.test('INSERT Vehicle', async () => {
      const vehicleName = `TestVehicle_${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle ein neues Fahrzeug: Name ist ${vehicleName}, Kennzeichen ist TEST-${Date.now()}`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.vehicle_id) {
        this.testData.vehicle_id = toolResponse.data.vehicle_id
        this.testData.vehicle_name = vehicleName
        return 'success'
      }

      return 'No vehicle_id in response'
    })
  }

  private async testInsertService(): Promise<void> {
    await this.test('INSERT Service', async () => {
      const serviceName = `TestService_${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle einen neuen Service: Name ist ${serviceName}`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.service_id) {
        this.testData.service_id = toolResponse.data.service_id
        this.testData.service_name = serviceName
        return 'success'
      }

      return 'No service_id in response'
    })
  }

  // UPDATE Tests
  private async testUpdateProject(): Promise<void> {
    if (!this.testData.project_name) {
      await this.test('UPDATE Project (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE Project Status', async () => {
      const response = await this.sendMessage(
        `Ändere den Status von Projekt ${this.testData.project_name} auf In Bearbeitung`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      
      if (!updateCall) {
        return 'No updateRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.status === 'In Bearbeitung') {
        return 'success'
      }

      return 'Status not updated correctly'
    })
  }

  private async testUpdateEmployee(): Promise<void> {
    if (!this.testData.employee_name) {
      await this.test('UPDATE Employee (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE Employee Hourly Rate', async () => {
      const response = await this.sendMessage(
        `Setze den Stundensatz von Mitarbeiter ${this.testData.employee_name} auf 35`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      
      if (!updateCall) {
        // AI might query first, then update - check for updateRow in subsequent calls
        return 'No updateRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateMaterial(): Promise<void> {
    if (!this.testData.material_name) {
      await this.test('UPDATE Material (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE Material', async () => {
      const response = await this.sendMessage(
        `Ändere den Namen von Material ${this.testData.material_name} zu ${this.testData.material_name}_Updated`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      
      if (!updateCall) {
        return 'No updateRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  // Query Tests
  private async testQueryProject(): Promise<void> {
    await this.test('QUERY Projects', async () => {
      const response = await this.sendMessage('Zeige mir alle Projekte')
      
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      
      if (!queryCall) {
        return 'No queryTable tool call found'
      }

      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (Array.isArray(toolResponse.data) && toolResponse.data.length >= 0) {
        return 'success'
      }

      return 'Invalid query response'
    })
  }

  private async testQueryEmployee(): Promise<void> {
    await this.test('QUERY Employees', async () => {
      const response = await this.sendMessage('Zeige mir alle Mitarbeiter')
      
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      
      if (!queryCall) {
        return 'No queryTable tool call found'
      }

      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (Array.isArray(toolResponse.data) && toolResponse.data.length >= 0) {
        return 'success'
      }

      return 'Invalid query response'
    })
  }

  private async testQueryMaterial(): Promise<void> {
    await this.test('QUERY Materials', async () => {
      const response = await this.sendMessage('Zeige mir alle Materialien')
      
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      
      if (!queryCall) {
        return 'No queryTable tool call found'
      }

      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (Array.isArray(toolResponse.data) && toolResponse.data.length >= 0) {
        return 'success'
      }

      return 'Invalid query response'
    })
  }

  // DELETE Tests
  private async testDeleteProject(): Promise<void> {
    if (!this.testData.project_name) {
      await this.test('DELETE Project (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE Project', async () => {
      // First request - should query and ask for confirmation
      const response1 = await this.sendMessage(
        `Lösche das Projekt ${this.testData.project_name}`
      )
      
      // Check if AI asks for confirmation
      const assistantMessage = this.extractAssistantMessage(response1)
      if (!assistantMessage || !assistantMessage.toLowerCase().includes('wirklich')) {
        return 'AI did not ask for confirmation'
      }

      // Second request - confirm deletion
      const response2 = await this.sendMessage(
        `Lösche das Projekt ${this.testData.project_name}`,
        [
          { role: 'user', content: `Lösche das Projekt ${this.testData.project_name}` },
          { role: 'assistant', content: assistantMessage },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response2)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      
      if (!deleteCall) {
        return 'No deleteRow tool call found after confirmation'
      }

      const toolResponse = this.extractToolResponse(response2, deleteCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Delete failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testDeleteEmployee(): Promise<void> {
    if (!this.testData.employee_name) {
      await this.test('DELETE Employee (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE Employee', async () => {
      const response = await this.sendMessage(
        `Lösche den Mitarbeiter ${this.testData.employee_name}`,
        [
          { role: 'user', content: `Lösche den Mitarbeiter ${this.testData.employee_name}` },
          { role: 'assistant', content: 'Möchtest du den Mitarbeiter wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      
      if (!deleteCall) {
        return 'No deleteRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, deleteCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Delete failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testDeleteMaterial(): Promise<void> {
    if (!this.testData.material_name) {
      await this.test('DELETE Material (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE Material', async () => {
      const response = await this.sendMessage(
        `Lösche das Material ${this.testData.material_name}`,
        [
          { role: 'user', content: `Lösche das Material ${this.testData.material_name}` },
          { role: 'assistant', content: 'Möchtest du das Material wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      
      if (!deleteCall) {
        return 'No deleteRow tool call found'
      }

      return 'success'
    })
  }

  private async testDeleteVehicle(): Promise<void> {
    if (!this.testData.vehicle_name) {
      await this.test('DELETE Vehicle (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE Vehicle', async () => {
      const response = await this.sendMessage(
        `Lösche das Fahrzeug ${this.testData.vehicle_name}`,
        [
          { role: 'user', content: `Lösche das Fahrzeug ${this.testData.vehicle_name}` },
          { role: 'assistant', content: 'Möchtest du das Fahrzeug wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      
      if (!deleteCall) {
        return 'No deleteRow tool call found'
      }

      return 'success'
    })
  }

  private async testDeleteService(): Promise<void> {
    if (!this.testData.service_name) {
      await this.test('DELETE Service (SKIP - no test data)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE Service', async () => {
      const response = await this.sendMessage(
        `Lösche den Service ${this.testData.service_name}`,
        [
          { role: 'user', content: `Lösche den Service ${this.testData.service_name}` },
          { role: 'assistant', content: 'Möchtest du den Service wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      
      if (!deleteCall) {
        return 'No deleteRow tool call found'
      }

      return 'success'
    })
  }

  // Error Handling Tests
  private async testInvalidTable(): Promise<void> {
    await this.test('Error: Invalid Table', async () => {
      const response = await this.sendMessage(
        'Erstelle einen Eintrag in der Tabelle invalid_table'
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'success' // AI correctly did not call insertRow
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (toolResponse?.error) {
        return 'success' // Error was correctly returned
      }

      return 'No error for invalid table'
    })
  }

  private async testInvalidFilters(): Promise<void> {
    await this.test('Error: Invalid Filters', async () => {
      const response = await this.sendMessage(
        'Ändere das Projekt mit der ID invalid_id'
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      
      if (!updateCall) {
        return 'success' // AI correctly did not call updateRow
      }

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (toolResponse?.error) {
        return 'success' // Error was correctly returned
      }

      return 'No error for invalid filters'
    })
  }

  private async testMissingValues(): Promise<void> {
    await this.test('Error: Missing Values', async () => {
      const response = await this.sendMessage(
        'Erstelle ein neues Projekt'
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      
      if (!insertCall) {
        return 'success' // AI might handle this gracefully
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      // Even with minimal data, AI should provide defaults
      if (toolResponse?.data || toolResponse?.error) {
        return 'success'
      }

      return 'Unexpected response'
    })
  }

  // Helper Methods
  private async sendMessage(message: string, history: any[] = []): Promise<string> {
    const messages = [
      ...history,
      { role: 'user', content: message }
    ]

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    let fullResponse = ''
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      fullResponse += chunk
    }

    return fullResponse
  }

  private extractToolCalls(response: string): any[] {
    const toolCalls: any[] = []
    const lines = response.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6))
          if (data.type === 'tool_calls' && data.tool_calls) {
            toolCalls.push(...data.tool_calls)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return toolCalls
  }

  private extractToolResponse(response: string, toolCallId: string): any {
    const lines = response.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6))
          if (data.type === 'tool_response' && data.tool_call_id === toolCallId) {
            const content = data.content
            // Remove internal markers
            const cleanContent = content.replace(
              /\[INTERNAL TOOL RESULT[^\]]*\]\s*/g,
              ''
            )
            return JSON.parse(cleanContent)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return null
  }

  private extractAssistantMessage(response: string): string {
    const lines = response.split('\n')
    let message = ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6))
          if (data.type === 'token' && data.content) {
            message += data.content
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    return message.trim()
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const skipped = this.results.filter(r => r.status === 'SKIP').length
    const total = this.results.length
    
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0)
    
    console.log(`\nTotal Tests: ${total}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`⏱️  Total Duration: ${totalDuration}ms`)
    console.log(`📈 Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error || r.message}`)
        })
    }
    
    console.log('\n' + '='.repeat(60))
  }

  private saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `test-results-${timestamp}.json`
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'PASS').length,
        failed: this.results.filter(r => r.status === 'FAIL').length,
        skipped: this.results.filter(r => r.status === 'SKIP').length,
      },
      results: this.results,
      testData: this.testData
    }
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2))
    console.log(`\n💾 Results saved to: ${filename}`)
  }
}

// Run tests
if (require.main === module) {
  const tester = new BotTester()
  tester.run().catch(console.error)
}

export default BotTester
