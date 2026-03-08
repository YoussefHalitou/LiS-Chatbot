/**
 * SSE streaming utilities and streaming completion handler
 * for the chat API route.
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { DateRange } from './inference'
import type { OpenAIMessage } from '@/types'
import { getToolDefinitions } from './tool-definitions'
import { handleToolCalls } from './tool-handlers'

// Re-use the OpenAI client from the route
let _getOpenAIClient: () => OpenAI

export function setOpenAIClientGetter(getter: () => OpenAI) {
  _getOpenAIClient = getter
}

export function buildSseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export function encodeSse(data: object) {
  const encoder = new TextEncoder()
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function handleStreamingCompletion(
  openaiMessages: OpenAIMessage[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null,
  userRole?: string | null
) {
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        const initialStream = await _getOpenAIClient().chat.completions.create({
          model: 'gpt-4o',
          messages: openaiMessages as ChatCompletionMessageParam[],
          tools: getToolDefinitions(),
          tool_choice: 'auto',
          temperature: 0.3,
          stream: true,
        })

        let needsToolCall = false
        const toolCallMap = new Map<
          number,
          {
            id?: string
            function: {
              name?: string
              arguments: string
            }
          }
        >()

        for await (const chunk of initialStream) {
          const delta = chunk.choices[0]?.delta
          if (!delta) continue

          if (delta.tool_calls) {
            needsToolCall = true
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index ?? 0
              const existing = toolCallMap.get(index) || {
                id: toolCall.id,
                function: { name: toolCall.function?.name, arguments: '' },
              }

              if (toolCall.id) existing.id = toolCall.id
              if (toolCall.function?.name) existing.function.name = toolCall.function.name
              if (toolCall.function?.arguments) {
                existing.function.arguments += toolCall.function.arguments
              }

              toolCallMap.set(index, existing)
            }
            continue
          }

          if (delta.content) {
            controller.enqueue(encodeSse({ type: 'token', content: delta.content }))
          }
        }

        if (needsToolCall) {
          const tool_calls = Array.from(toolCallMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, value]) => ({
              id: value.id,
              type: 'function' as const,
              function: value.function,
            }))

          // Send tool calls to client so they can be preserved in message history
          controller.enqueue(encodeSse({ type: 'tool_calls', tool_calls }))

          // Get last user message for context
          const lastUserMsg = openaiMessages
            .filter((m) => m.role === 'user')
            .pop()?.content || ''

          // Track how many tool messages exist before handleToolCalls
          const toolMessageCountBefore = openaiMessages.filter((m) => m.role === 'tool').length

          await handleToolCalls(
            { tool_calls, content: null },
            openaiMessages,
            requestedDateRange,
            requestedProjectIdentifiers,
            lastUserMsg,
            userRole
          )

          // Send tool response messages to client so they can be preserved
          // Get only the tool messages that were just added
          const allToolMessages = openaiMessages.filter((m) => m.role === 'tool')
          const newToolMessages = allToolMessages.slice(toolMessageCountBefore)

          for (const toolResponse of newToolMessages) {
            controller.enqueue(encodeSse({
              type: 'tool_response',
              tool_call_id: toolResponse.tool_call_id,
              content: toolResponse.content
            }))
          }

          const finalStream = await _getOpenAIClient().chat.completions.create({
            model: 'gpt-4o',
            messages: openaiMessages as ChatCompletionMessageParam[],
            temperature: 0.3,
            stream: true,
          })

          for await (const chunk of finalStream) {
            const delta = chunk.choices[0]?.delta
            if (!delta) continue
            if (delta.content) {
              controller.enqueue(encodeSse({ type: 'token', content: delta.content }))
            }
          }
        }

        controller.enqueue(encodeSse({ type: 'done' }))
        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        controller.enqueue(
          encodeSse({
            type: 'error',
            message: error instanceof Error ? error.message : 'An error occurred while streaming.',
          })
        )
        controller.close()
      }
    },
  })

  return buildSseResponse(stream)
}
