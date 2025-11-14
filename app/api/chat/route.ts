import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { queryTable, getTableNames, getTableStructure } from '@/lib/supabase-query'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

/**
 * System prompt that instructs the AI on how to handle database queries
 */
const SYSTEM_PROMPT = `You are a helpful assistant connected to a Supabase database. Your role is to:

1. Answer questions based on the database content when relevant
2. Generate appropriate queries to fetch data from the database
3. Never hallucinate or invent data - if data doesn't exist, say so clearly
4. When a question requires database access, you should:
   - Identify which table(s) might contain the relevant data based on the question context
   - Proactively try querying likely table names (e.g., if asked about users, try "users" table; if asked about products, try "products" table)
   - Use the queryTable function to execute queries
   - Interpret the results and provide a natural language answer

You have access to query tables in the Supabase database. When you need to query data:
- Use the queryTable function with the table name
- You can specify filters as key-value pairs
- Results will be returned as JSON
- If a table doesn't exist, you'll get an error - in that case, try other likely table names or ask the user for clarification

IMPORTANT: Even if you cannot list all available tables, you should still attempt to query tables based on the context of the user's question. For example:
- Questions about users/accounts → try "users", "accounts", "user_profiles"
- Questions about products/items → try "products", "items", "inventory"
- Questions about orders/purchases → try "orders", "purchases", "transactions"
- Questions about posts/articles → try "posts", "articles", "blog_posts"

Always be honest about what data is available. If a query returns no results or the table doesn't exist, inform the user and suggest they might need to check the table name or that the data might not exist yet.`

interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
  content: string
  name?: string
  tool_calls?: any[]
  tool_call_id?: string
}

interface ChatRequest {
  messages: Message[]
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ]

    // Add user messages and assistant responses
    for (const message of messages) {
      const openaiMessage: any = {
        role: message.role,
        content: message.content,
      }
      
      // Preserve tool calls if present (for assistant messages)
      if (message.tool_calls) {
        openaiMessage.tool_calls = message.tool_calls
      }
      
      // Preserve tool call ID if present (for tool/function messages)
      if (message.tool_call_id) {
        openaiMessage.tool_call_id = message.tool_call_id
      }
      
      openaiMessages.push(openaiMessage)
    }

    // Create a completion with tools (function calling) for database queries
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: openaiMessages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'queryTable',
            description: 'Query a table in the Supabase database with optional filters',
            parameters: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'The name of the table to query',
                },
                filters: {
                  type: 'object',
                  description: 'Optional filters to apply (key-value pairs)',
                  additionalProperties: true,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 100)',
                  default: 100,
                },
              },
              required: ['tableName'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'getTableNames',
            description: 'Get a list of available table names in the database',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'getTableStructure',
            description: 'Get the structure (column names) of a specific table. Use this to understand what fields are available before querying.',
            parameters: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'The name of the table to get structure for',
                },
              },
              required: ['tableName'],
            },
          },
        },
      ],
      tool_choice: 'auto',
      temperature: 0.7,
    })

    const responseMessage = completion.choices[0].message

    // Check if the model wants to call a tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Add the assistant's tool call request to the conversation
      openaiMessages.push({
        role: 'assistant',
        content: responseMessage.content,
        tool_calls: responseMessage.tool_calls,
      })

      // Execute all tool calls
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}')

        let functionResult: any

        // Execute the function
        if (functionName === 'queryTable') {
          const result = await queryTable(
            functionArgs.tableName,
            functionArgs.filters || {},
            functionArgs.limit || 100
          )
          functionResult = result
        } else if (functionName === 'getTableNames') {
          const result = await getTableNames()
          functionResult = result
        } else if (functionName === 'getTableStructure') {
          const result = await getTableStructure(functionArgs.tableName)
          functionResult = result
        } else {
          functionResult = { error: `Unknown function: ${functionName}` }
        }

        // Add the function result to the conversation
        openaiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        })
      }

      // Get the final response from OpenAI after tool execution
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        temperature: 0.7,
      })

      const finalMessage = finalCompletion.choices[0].message

      return NextResponse.json({
        message: {
          role: 'assistant',
          content: finalMessage.content || 'I processed your request, but got no response.',
        },
      })
    }

    // Return the assistant's response
    return NextResponse.json({
      message: {
        role: 'assistant',
        content: responseMessage.content,
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An error occurred',
      },
      { status: 500 }
    )
  }
}

