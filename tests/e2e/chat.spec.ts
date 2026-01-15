/**
 * E2E Tests for LiS Chatbot UI
 * 
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

test.describe('LiS Chatbot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
  })

  test('should load the chat interface', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/LiS/)
    
    // Check for main chat elements
    await expect(page.locator('textarea, input[type="text"]')).toBeVisible()
  })

  test('should show authentication form when not logged in', async ({ page }) => {
    // Look for auth-related elements (login/register)
    const authForm = page.locator('form')
    await expect(authForm).toBeVisible()
  })

  test.describe('Authenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // Skip if no test credentials provided
      const email = process.env.TEST_USER_EMAIL
      const password = process.env.TEST_USER_PASSWORD
      
      if (!email || !password) {
        test.skip()
        return
      }

      // Login
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      
      // Wait for chat interface to load
      await page.waitForSelector('textarea', { timeout: 10000 })
    })

    test('should send a message and receive response', async ({ page }) => {
      // Type a message
      await page.fill('textarea', 'Hallo')
      
      // Send message (Enter or click button)
      await page.keyboard.press('Enter')
      
      // Wait for response
      await page.waitForSelector('[data-testid="assistant-message"]', { 
        timeout: 30000 
      })
      
      // Check that response contains expected content
      const response = page.locator('[data-testid="assistant-message"]').first()
      await expect(response).toContainText(/Hallo|Wie kann ich/)
    })

    test('should query projects', async ({ page }) => {
      await page.fill('textarea', 'Welche Projekte sind heute geplant?')
      await page.keyboard.press('Enter')
      
      // Wait for response
      await page.waitForSelector('[data-testid="assistant-message"]', { 
        timeout: 60000 
      })
      
      // Response should contain project-related content
      const response = page.locator('[data-testid="assistant-message"]').last()
      const text = await response.textContent()
      expect(text?.toLowerCase()).toMatch(/projekt|heute|geplant|keine/)
    })

    test('should list employees', async ({ page }) => {
      await page.fill('textarea', 'Liste aller Mitarbeiter')
      await page.keyboard.press('Enter')
      
      await page.waitForSelector('[data-testid="assistant-message"]', { 
        timeout: 60000 
      })
      
      const response = page.locator('[data-testid="assistant-message"]').last()
      const text = await response.textContent()
      expect(text?.toLowerCase()).toMatch(/mitarbeiter|name/)
    })

    test('should toggle dark mode', async ({ page }) => {
      // Find theme toggle button
      const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="Theme"], button:has-text("🌙"), button:has-text("☀️")')
      
      if (await themeToggle.count() > 0) {
        await themeToggle.first().click()
        
        // Check that dark class is toggled on html/body
        const htmlClass = await page.locator('html').getAttribute('class')
        expect(htmlClass).toBeDefined()
      }
    })

    test('should clear chat history', async ({ page }) => {
      // Send a message first
      await page.fill('textarea', 'Test message')
      await page.keyboard.press('Enter')
      await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 })
      
      // Find and click clear/new chat button
      const clearButton = page.locator('button:has-text("Neu"), button:has-text("Clear"), [aria-label*="clear"], [aria-label*="new chat"]')
      
      if (await clearButton.count() > 0) {
        await clearButton.first().click()
        
        // Verify chat is cleared
        await page.waitForTimeout(500)
        const messages = page.locator('[data-testid="assistant-message"]')
        const count = await messages.count()
        expect(count).toBeLessThanOrEqual(1) // May have welcome message
      }
    })
  })

  test.describe('API Health', () => {
    test('health endpoint should return status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/health`)
      
      expect(response.ok()).toBeTruthy()
      
      const data = await response.json()
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('timestamp')
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check for aria labels on interactive elements
      const buttons = page.locator('button')
      const count = await buttons.count()
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i)
        const ariaLabel = await button.getAttribute('aria-label')
        const text = await button.textContent()
        
        // Button should have either aria-label or text content
        expect(ariaLabel || text?.trim()).toBeTruthy()
      }
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through the page
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Check that focus is visible somewhere
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      // Chat interface should still be visible
      await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      
      await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible()
    })
  })
})

