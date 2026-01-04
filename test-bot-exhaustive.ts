#!/usr/bin/env node
/**
 * Exhaustive Bot Test Script
 * 
 * Comprehensive tests covering:
 * - Query operations (asking questions about database information)
 * - INSERT operations for all allowed tables
 * - UPDATE operations for all created entries
 * - DELETE operations (only for entries created in this session)
 * 
 * Usage: npx tsx test-bot-exhaustive.ts
 */

import * as fs from 'fs'
// @ts-ignore - node-fetch is CommonJS
const fetch = require('node-fetch')

const API_URL = process.env.API_URL || 'http://localhost:3000/api/chat'
const TEST_TIMEOUT = 45000 // 45 seconds per test

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
  error?: string
}

interface CreatedEntry {
  table: string
  id: string
  identifier: string // name or other identifier for deletion
  created_at: string
}

class ExhaustiveBotTester {
  private results: TestResult[] = []
  private createdEntries: CreatedEntry[] = []
  private testCounter = 0
  private sessionId = `TEST_${Date.now()}`

  async run() {
    console.log('🚀 Starting Exhaustive Bot Tests\n')
    console.log(`API URL: ${API_URL}`)
    console.log(`Session ID: ${this.sessionId}\n`)

    try {
      // Test Query Operations (asking questions)
      await this.testSection('📊 Query Operations (Asking Questions)', async () => {
        await this.testQueryProjects()
        await this.testQueryEmployees()
        await this.testQueryMaterials()
        await this.testQueryVehicles()
        await this.testQueryServices()
        await this.testQueryMorningPlan()
        await this.testQueryStatistics()
        await this.testQueryViews()
      })

      // Test INSERT Operations (creating entries)
      await this.testSection('➕ INSERT Operations (Creating Entries)', async () => {
        await this.testInsertProject()
        await this.testInsertEmployee()
        await this.testInsertMaterial()
        await this.testInsertVehicle()
        await this.testInsertService()
        await this.testInsertMaterialPrice()
        await this.testInsertMorningPlan()
        await this.testInsertMorningPlanStaff()
      })

      // Test UPDATE Operations (modifying entries)
      await this.testSection('✏️ UPDATE Operations (Modifying Entries)', async () => {
        await this.testUpdateProject()
        await this.testUpdateEmployee()
        await this.testUpdateMaterial()
        await this.testUpdateVehicle()
        await this.testUpdateService()
        await this.testUpdateMorningPlan()
      })

      // Test DELETE Operations (only session-created entries)
      await this.testSection('🗑️ DELETE Operations (Session-Created Entries Only)', async () => {
        await this.testDeleteMorningPlanStaff()
        await this.testDeleteMorningPlan()
        await this.testDeleteMaterialPrice()
        await this.testDeleteService()
        await this.testDeleteVehicle()
        await this.testDeleteMaterial()
        await this.testDeleteEmployee()
        await this.testDeleteProject()
      })

    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      this.printSummary()
      this.saveResults()
      this.printCleanupInstructions()
    }
  }

  private async testSection(name: string, tests: () => Promise<void>) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`📋 ${name}`)
    console.log('='.repeat(70))
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

  // ==================== QUERY TESTS ====================

  private async testQueryProjects(): Promise<void> {
    await this.test('QUERY: Show all projects', async () => {
      const response = await this.sendMessage('Zeige mir alle Projekte')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      if (Array.isArray(toolResponse.data)) return 'success'
      return 'Invalid query response'
    })
  }

  private async testQueryEmployees(): Promise<void> {
    await this.test('QUERY: Show all employees', async () => {
      const response = await this.sendMessage('Zeige mir alle Mitarbeiter')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      if (Array.isArray(toolResponse.data)) return 'success'
      return 'Invalid query response'
    })
  }

  private async testQueryMaterials(): Promise<void> {
    await this.test('QUERY: Show all materials', async () => {
      const response = await this.sendMessage('Zeige mir alle Materialien')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      if (Array.isArray(toolResponse.data)) return 'success'
      return 'Invalid query response'
    })
  }

  private async testQueryVehicles(): Promise<void> {
    await this.test('QUERY: Show all vehicles', async () => {
      const response = await this.sendMessage('Zeige mir alle Fahrzeuge')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      if (Array.isArray(toolResponse.data)) return 'success'
      return 'Invalid query response'
    })
  }

  private async testQueryServices(): Promise<void> {
    await this.test('QUERY: Show all services', async () => {
      const response = await this.sendMessage('Zeige mir alle Services')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const toolResponse = this.extractToolResponse(response, queryCall.id)
      if (!toolResponse || toolResponse.error) return `Query failed: ${toolResponse?.error || 'Unknown error'}`
      if (Array.isArray(toolResponse.data)) return 'success'
      return 'Invalid query response'
    })
  }

  private async testQueryMorningPlan(): Promise<void> {
    await this.test('QUERY: Show morning plan for today', async () => {
      const today = new Date().toISOString().split('T')[0]
      const response = await this.sendMessage(`Zeige mir den Morgenplan für heute (${today})`)
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => 
        tc.function?.name === 'queryTable' || tc.function?.name === 'getStatistics'
      )
      if (!queryCall) return 'No query tool call found'
      return 'success'
    })
  }

  private async testQueryStatistics(): Promise<void> {
    await this.test('QUERY: Statistics - How many employees?', async () => {
      const response = await this.sendMessage('Wie viele Mitarbeiter gibt es?')
      const toolCalls = this.extractToolCalls(response)
      const statsCall = toolCalls.find((tc: any) => tc.function?.name === 'getStatistics')
      if (!statsCall) return 'No getStatistics tool call found'
      return 'success'
    })
  }

  private async testQueryViews(): Promise<void> {
    await this.test('QUERY: View - Morning plan full', async () => {
      const response = await this.sendMessage('Zeige mir alle Einsätze mit Mitarbeitern')
      const toolCalls = this.extractToolCalls(response)
      const queryCall = toolCalls.find((tc: any) => tc.function?.name === 'queryTable')
      if (!queryCall) return 'No queryTable tool call found'
      const args = JSON.parse(queryCall.function?.arguments || '{}')
      if (args.tableName === 'v_morningplan_full' || args.tableName === 't_morningplan') {
        return 'success'
      }
      return 'View not used correctly'
    })
  }

  // ==================== INSERT TESTS ====================

  private async testInsertProject(): Promise<void> {
    await this.test('INSERT: Create new project', async () => {
      const projectName = `${this.sessionId}_Project`
      const response = await this.sendMessage(
        `Erstelle ein neues Projekt: Name ist ${projectName}, Stadt ist Berlin`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) return 'No insertRow tool call found'

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.project_id) {
        this.createdEntries.push({
          table: 't_projects',
          id: toolResponse.data.project_id,
          identifier: projectName,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No project_id in response'
    })
  }

  private async testInsertEmployee(): Promise<void> {
    await this.test('INSERT: Create new employee', async () => {
      const employeeName = `${this.sessionId}_Employee`
      const response = await this.sendMessage(
        `Erstelle einen neuen Mitarbeiter: Name ist ${employeeName}, Stundensatz ist 30`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) return 'No insertRow tool call found'

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.employee_id) {
        this.createdEntries.push({
          table: 't_employees',
          id: toolResponse.data.employee_id,
          identifier: employeeName,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No employee_id in response'
    })
  }

  private async testInsertMaterial(): Promise<void> {
    await this.test('INSERT: Create new material', async () => {
      const materialName = `${this.sessionId}_Material`
      const response = await this.sendMessage(
        `Erstelle ein neues Material: Name ist ${materialName}, Einheit ist Stück`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) return 'No insertRow tool call found'

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.material_id) {
        this.createdEntries.push({
          table: 't_materials',
          id: toolResponse.data.material_id,
          identifier: materialName,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No material_id in response'
    })
  }

  private async testInsertVehicle(): Promise<void> {
    await this.test('INSERT: Create new vehicle', async () => {
      const vehicleName = `${this.sessionId}_Vehicle`
      const vehicleId = `VEH-${Date.now()}`
      const response = await this.sendMessage(
        `Erstelle ein neues Fahrzeug: vehicle_id ist ${vehicleId}, nickname ist ${vehicleName}`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) return 'No insertRow tool call found'

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.vehicle_id) {
        this.createdEntries.push({
          table: 't_vehicles',
          id: toolResponse.data.vehicle_id,
          identifier: vehicleName,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No vehicle_id in response'
    })
  }

  private async testInsertService(): Promise<void> {
    await this.test('INSERT: Create new service', async () => {
      const serviceName = `${this.sessionId}_Service`
      const response = await this.sendMessage(
        `Erstelle einen neuen Service: Name ist ${serviceName}`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) {
        // Debug: Log what tool calls were found
        console.log(`  [DEBUG] Found ${toolCalls.length} tool calls:`, toolCalls.map((tc: any) => tc.function?.name))
        return 'No insertRow tool call found'
      }

      // Debug: Check if values parameter exists
      const args = JSON.parse(insertCall.function?.arguments || '{}')
      if (!args.values || Object.keys(args.values).length === 0) {
        console.log(`  [DEBUG] insertRow called but values is missing or empty. Args:`, JSON.stringify(args, null, 2))
        return 'Insert failed: Missing values for insertRow.'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.service_id) {
        this.createdEntries.push({
          table: 't_services',
          id: toolResponse.data.service_id,
          identifier: serviceName,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No service_id in response'
    })
  }

  private async testInsertMaterialPrice(): Promise<void> {
    // First, we need a material
    const materialEntry = this.createdEntries.find(e => e.table === 't_materials')
    if (!materialEntry) {
      await this.test('INSERT: Create material price (SKIP - no material)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('INSERT: Create material price', async () => {
      const response = await this.sendMessage(
        `Erstelle einen Preis für Material ${materialEntry.identifier}: Einkaufspreis ist 10, Verkaufspreis ist 20`
      )
      
      const toolCalls = this.extractToolCalls(response)
      if (toolCalls.length === 0) {
        // Debug: Check if there's any response at all
        console.log(`  [DEBUG] No tool calls found. Response preview:`, response.substring(0, 500))
      }
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) {
        console.log(`  [DEBUG] Found ${toolCalls.length} tool calls:`, toolCalls.map((tc: any) => tc.function?.name))
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.material_id) {
        this.createdEntries.push({
          table: 't_material_prices',
          id: toolResponse.data.material_id,
          identifier: `${materialEntry.identifier}_price`,
          created_at: toolResponse.data.updated_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No material_id in response'
    })
  }

  private async testInsertMorningPlan(): Promise<void> {
    // First, we need a project
    const projectEntry = this.createdEntries.find(e => e.table === 't_projects')
    if (!projectEntry) {
      await this.test('INSERT: Create morning plan (SKIP - no project)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('INSERT: Create morning plan', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      
      const response = await this.sendMessage(
        `Erstelle einen Morgenplan für Projekt ${projectEntry.identifier} am ${dateStr} um 08:00`
      )
      
      const toolCalls = this.extractToolCalls(response)
      if (toolCalls.length === 0) {
        console.log(`  [DEBUG] No tool calls found. Response preview:`, response.substring(0, 500))
      }
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) {
        console.log(`  [DEBUG] Found ${toolCalls.length} tool calls:`, toolCalls.map((tc: any) => tc.function?.name))
        return 'No insertRow tool call found'
      }

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.plan_id) {
        this.createdEntries.push({
          table: 't_morningplan',
          id: toolResponse.data.plan_id,
          identifier: `${projectEntry.identifier}_plan`,
          created_at: toolResponse.data.created_at || new Date().toISOString()
        })
        return 'success'
      }

      return 'No plan_id in response'
    })
  }

  private async testInsertMorningPlanStaff(): Promise<void> {
    // First, we need a morning plan and an employee
    const planEntry = this.createdEntries.find(e => e.table === 't_morningplan')
    const employeeEntry = this.createdEntries.find(e => e.table === 't_employees')
    
    if (!planEntry || !employeeEntry) {
      await this.test('INSERT: Create morning plan staff (SKIP - no plan/employee)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('INSERT: Create morning plan staff assignment', async () => {
      const response = await this.sendMessage(
        `Füge Mitarbeiter ${employeeEntry.identifier} zum Morgenplan ${planEntry.identifier} hinzu`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const insertCall = toolCalls.find((tc: any) => tc.function?.name === 'insertRow')
      if (!insertCall) return 'No insertRow tool call found'

      const toolResponse = this.extractToolResponse(response, insertCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Insert failed: ${toolResponse?.error || 'Unknown error'}`
      }

      if (toolResponse.data?.id || toolResponse.data?.plan_id) {
        this.createdEntries.push({
          table: 't_morningplan_staff',
          id: toolResponse.data.id || toolResponse.data.plan_id,
          identifier: `${planEntry.identifier}_${employeeEntry.identifier}`,
          created_at: new Date().toISOString()
        })
        return 'success'
      }

      return 'No id in response'
    })
  }

  // ==================== UPDATE TESTS ====================

  private async testUpdateProject(): Promise<void> {
    const projectEntry = this.createdEntries.find(e => e.table === 't_projects')
    if (!projectEntry) {
      await this.test('UPDATE: Update project (SKIP - no project)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update project status', async () => {
      const response = await this.sendMessage(
        `Setze den Status von Projekt ${projectEntry.identifier} auf In Bearbeitung`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) return 'No updateRow tool call found'

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateEmployee(): Promise<void> {
    const employeeEntry = this.createdEntries.find(e => e.table === 't_employees')
    if (!employeeEntry) {
      await this.test('UPDATE: Update employee (SKIP - no employee)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update employee hourly rate', async () => {
      const response = await this.sendMessage(
        `Setze den Stundensatz von Mitarbeiter ${employeeEntry.identifier} auf 35`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) {
        // AI might query first, then update - that's acceptable
        return 'No updateRow tool call found (might need query first)'
      }

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateMaterial(): Promise<void> {
    const materialEntry = this.createdEntries.find(e => e.table === 't_materials')
    if (!materialEntry) {
      await this.test('UPDATE: Update material (SKIP - no material)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update material', async () => {
      const response = await this.sendMessage(
        `Ändere den Namen von Material ${materialEntry.identifier} zu ${materialEntry.identifier}_Updated`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) return 'No updateRow tool call found'

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateVehicle(): Promise<void> {
    const vehicleEntry = this.createdEntries.find(e => e.table === 't_vehicles')
    if (!vehicleEntry) {
      await this.test('UPDATE: Update vehicle (SKIP - no vehicle)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update vehicle status', async () => {
      // Use the actual vehicle_id instead of identifier for better matching
      const response = await this.sendMessage(
        `Setze den Status von Fahrzeug ${vehicleEntry.id} auf in_repair`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) {
        console.log(`  [DEBUG] Found ${toolCalls.length} tool calls:`, toolCalls.map((tc: any) => tc.function?.name))
        return 'No updateRow tool call found'
      }

      // Debug: Check filters
      const args = JSON.parse(updateCall.function?.arguments || '{}')
      console.log(`  [DEBUG] updateRow filters:`, JSON.stringify(args.filters, null, 2))
      console.log(`  [DEBUG] Vehicle identifier: ${vehicleEntry.identifier}, ID: ${vehicleEntry.id}`)

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateService(): Promise<void> {
    const serviceEntry = this.createdEntries.find(e => e.table === 't_services')
    if (!serviceEntry) {
      await this.test('UPDATE: Update service (SKIP - no service)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update service', async () => {
      const response = await this.sendMessage(
        `Ändere den Namen von Service ${serviceEntry.identifier} zu ${serviceEntry.identifier}_Updated`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) return 'No updateRow tool call found'

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testUpdateMorningPlan(): Promise<void> {
    const planEntry = this.createdEntries.find(e => e.table === 't_morningplan')
    if (!planEntry) {
      await this.test('UPDATE: Update morning plan (SKIP - no plan)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('UPDATE: Update morning plan', async () => {
      const response = await this.sendMessage(
        `Ändere die Notizen von Morgenplan ${planEntry.identifier} zu "Test Notiz"`
      )
      
      const toolCalls = this.extractToolCalls(response)
      const updateCall = toolCalls.find((tc: any) => tc.function?.name === 'updateRow')
      if (!updateCall) return 'No updateRow tool call found'

      const toolResponse = this.extractToolResponse(response, updateCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Update failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  // ==================== DELETE TESTS ====================

  private async testDeleteMorningPlanStaff(): Promise<void> {
    const staffEntry = this.createdEntries.find(e => e.table === 't_morningplan_staff')
    if (!staffEntry) {
      await this.test('DELETE: Morning plan staff (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Morning plan staff', async () => {
      const response = await this.sendMessage(
        `Lösche die Mitarbeiterzuweisung ${staffEntry.identifier}`,
        [
          { role: 'user', content: `Lösche die Mitarbeiterzuweisung ${staffEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du die Mitarbeiterzuweisung wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      const toolResponse = this.extractToolResponse(response, deleteCall.id)
      if (!toolResponse || toolResponse.error) {
        return `Delete failed: ${toolResponse?.error || 'Unknown error'}`
      }

      return 'success'
    })
  }

  private async testDeleteMorningPlan(): Promise<void> {
    const planEntry = this.createdEntries.find(e => e.table === 't_morningplan')
    if (!planEntry) {
      await this.test('DELETE: Morning plan (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Morning plan', async () => {
      const response = await this.sendMessage(
        `Lösche den Morgenplan ${planEntry.identifier}`,
        [
          { role: 'user', content: `Lösche den Morgenplan ${planEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du den Morgenplan wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  private async testDeleteMaterialPrice(): Promise<void> {
    const priceEntry = this.createdEntries.find(e => e.table === 't_material_prices')
    if (!priceEntry) {
      await this.test('DELETE: Material price (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Material price', async () => {
      const response = await this.sendMessage(
        `Lösche den Preis für Material ${priceEntry.identifier}`,
        [
          { role: 'user', content: `Lösche den Preis für Material ${priceEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du den Preis wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  private async testDeleteService(): Promise<void> {
    const serviceEntry = this.createdEntries.find(e => e.table === 't_services')
    if (!serviceEntry) {
      await this.test('DELETE: Service (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Service', async () => {
      const response = await this.sendMessage(
        `Lösche den Service ${serviceEntry.identifier}`,
        [
          { role: 'user', content: `Lösche den Service ${serviceEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du den Service wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  private async testDeleteVehicle(): Promise<void> {
    const vehicleEntry = this.createdEntries.find(e => e.table === 't_vehicles')
    if (!vehicleEntry) {
      await this.test('DELETE: Vehicle (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Vehicle', async () => {
      const response = await this.sendMessage(
        `Lösche das Fahrzeug ${vehicleEntry.identifier}`,
        [
          { role: 'user', content: `Lösche das Fahrzeug ${vehicleEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du das Fahrzeug wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      if (toolCalls.length === 0) {
        console.log(`  [DEBUG] No tool calls found after confirmation. Response preview:`, response.substring(0, 500))
      }
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) {
        console.log(`  [DEBUG] Found ${toolCalls.length} tool calls:`, toolCalls.map((tc: any) => tc.function?.name))
        return 'No deleteRow tool call found'
      }

      return 'success'
    })
  }

  private async testDeleteMaterial(): Promise<void> {
    const materialEntry = this.createdEntries.find(e => e.table === 't_materials')
    if (!materialEntry) {
      await this.test('DELETE: Material (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Material', async () => {
      const response = await this.sendMessage(
        `Lösche das Material ${materialEntry.identifier}`,
        [
          { role: 'user', content: `Lösche das Material ${materialEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du das Material wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  private async testDeleteEmployee(): Promise<void> {
    const employeeEntry = this.createdEntries.find(e => e.table === 't_employees')
    if (!employeeEntry) {
      await this.test('DELETE: Employee (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Employee', async () => {
      const response = await this.sendMessage(
        `Lösche den Mitarbeiter ${employeeEntry.identifier}`,
        [
          { role: 'user', content: `Lösche den Mitarbeiter ${employeeEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du den Mitarbeiter wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  private async testDeleteProject(): Promise<void> {
    const projectEntry = this.createdEntries.find(e => e.table === 't_projects')
    if (!projectEntry) {
      await this.test('DELETE: Project (SKIP - no entry)', async () => {
        return 'SKIP'
      })
      return
    }

    await this.test('DELETE: Project', async () => {
      const response = await this.sendMessage(
        `Lösche das Projekt ${projectEntry.identifier}`,
        [
          { role: 'user', content: `Lösche das Projekt ${projectEntry.identifier}` },
          { role: 'assistant', content: 'Möchtest du das Projekt wirklich löschen?' },
          { role: 'user', content: 'ja' }
        ]
      )
      
      const toolCalls = this.extractToolCalls(response)
      const deleteCall = toolCalls.find((tc: any) => tc.function?.name === 'deleteRow')
      if (!deleteCall) return 'No deleteRow tool call found'

      return 'success'
    })
  }

  // ==================== HELPER METHODS ====================

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

    // Handle node-fetch response (Node.js Stream) vs native fetch (ReadableStream)
    if (response.body && typeof (response.body as any).getReader === 'function') {
      // Native fetch with ReadableStream
      const reader = (response.body as any).getReader()
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
    } else {
      // node-fetch - use text() method
      return await response.text()
    }
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

  private printSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(70))
    
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
    if (total - skipped > 0) {
      console.log(`📈 Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`)
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error || r.message}`)
        })
    }
    
    console.log(`\n📝 Created Entries: ${this.createdEntries.length}`)
    this.createdEntries.forEach(entry => {
      console.log(`  - ${entry.table}: ${entry.identifier} (${entry.id})`)
    })
    
    console.log('\n' + '='.repeat(70))
  }

  private saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `test-results-exhaustive-${timestamp}.json`
    
    const report = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'PASS').length,
        failed: this.results.filter(r => r.status === 'FAIL').length,
        skipped: this.results.filter(r => r.status === 'SKIP').length,
      },
      results: this.results,
      createdEntries: this.createdEntries
    }
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2))
    console.log(`\n💾 Results saved to: ${filename}`)
  }

  private printCleanupInstructions() {
    if (this.createdEntries.length > 0) {
      console.log('\n⚠️  CLEANUP REQUIRED')
      console.log('='.repeat(70))
      console.log('Some entries may not have been deleted. Please manually verify:')
      this.createdEntries.forEach(entry => {
        console.log(`  - ${entry.table}: ${entry.identifier} (ID: ${entry.id})`)
      })
      console.log('\nTo clean up manually, use:')
      this.createdEntries.forEach(entry => {
        console.log(`  DELETE FROM ${entry.table} WHERE ${this.getPrimaryKey(entry.table)} = '${entry.id}';`)
      })
    }
  }

  private getPrimaryKey(table: string): string {
    const primaryKeys: Record<string, string> = {
      't_projects': 'project_id',
      't_employees': 'employee_id',
      't_materials': 'material_id',
      't_vehicles': 'vehicle_id',
      't_services': 'service_id',
      't_material_prices': 'material_id',
      't_morningplan': 'plan_id',
      't_morningplan_staff': 'id',
    }
    return primaryKeys[table] || 'id'
  }
}

// Run tests
if (require.main === module) {
  const tester = new ExhaustiveBotTester()
  tester.run().catch(console.error)
}

export default ExhaustiveBotTester
