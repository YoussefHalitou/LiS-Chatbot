/**
 * Visual Regression Tests for LiS Chatbot
 * Uses Playwright's screenshot comparison for visual testing
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

test.describe('Visual Regression', () => {
  test.describe('Desktop Views', () => {
    test.use({
      viewport: { width: 1280, height: 720 },
    })

    test('homepage - light mode', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Wait for animations
      
      // Ensure light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark')
      })
      
      await expect(page).toHaveScreenshot('homepage-desktop-light.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      })
    })

    test('homepage - dark mode', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })
      
      await page.waitForTimeout(300) // Wait for theme transition
      
      await expect(page).toHaveScreenshot('homepage-desktop-dark.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      })
    })

    test('empty state', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Look for empty state / welcome section
      const emptyState = page.locator('text=/willkommen|assistant/i').first()
      
      if (await emptyState.isVisible().catch(() => false)) {
        await expect(page).toHaveScreenshot('empty-state-desktop.png', {
          maxDiffPixels: 150,
          threshold: 0.2,
        })
      }
    })
  })

  test.describe('Mobile Views', () => {
    test.use({
      viewport: { width: 375, height: 812 },
    })

    test('homepage - mobile light', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark')
      })
      
      await expect(page).toHaveScreenshot('homepage-mobile-light.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      })
    })

    test('homepage - mobile dark', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })
      
      await page.waitForTimeout(300)
      
      await expect(page).toHaveScreenshot('homepage-mobile-dark.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
      })
    })

    test('bottom navigation', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Focus on bottom portion of screen
      const bottomNav = page.locator('nav').last()
      
      if (await bottomNav.isVisible().catch(() => false)) {
        await expect(bottomNav).toHaveScreenshot('bottom-nav-mobile.png', {
          maxDiffPixels: 50,
          threshold: 0.2,
        })
      }
    })
  })

  test.describe('Component Screenshots', () => {
    test.use({
      viewport: { width: 800, height: 600 },
    })

    test('input area', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      const inputArea = page.locator('textarea, input[type="text"]').first()
      
      if (await inputArea.isVisible()) {
        // Get parent container for better context
        const inputContainer = inputArea.locator('xpath=..')
        
        await expect(inputContainer).toHaveScreenshot('input-area.png', {
          maxDiffPixels: 50,
          threshold: 0.2,
        })
      }
    })

    test('button styles', async ({ page }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // Find primary action button (send/submit)
      const sendButton = page.locator('button[type="submit"], button').filter({ hasText: /send|senden/i }).first()
      
      if (await sendButton.isVisible().catch(() => false)) {
        await expect(sendButton).toHaveScreenshot('send-button.png', {
          maxDiffPixels: 20,
          threshold: 0.1,
        })
      }
    })
  })
})

test.describe('Animation States', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
  })

  test('loading state', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Type and send a message to trigger loading state
    const textarea = page.locator('textarea').first()
    
    if (await textarea.isVisible()) {
      await textarea.fill('Test message')
      await page.keyboard.press('Enter')
      
      // Quickly capture loading state
      await page.waitForTimeout(100)
      
      // Look for loading indicator
      const loadingIndicator = page.locator('.animate-pulse, .animate-spin, [data-loading="true"]').first()
      
      if (await loadingIndicator.isVisible().catch(() => false)) {
        await expect(loadingIndicator).toHaveScreenshot('loading-indicator.png', {
          maxDiffPixels: 100,
          threshold: 0.3,
        })
      }
    }
  })
})
