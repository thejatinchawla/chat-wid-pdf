/**
 * POST /api/chat
 * Chat with documents using RAG
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { config } from '@/lib/config';
import { retrieveChunksForQuery } from '@/lib/retrieval';
import { buildChatMessages, extractCitations } from '@/lib/prompt';
import OpenAI from 'openai';

const chatSchema = z.object({
  question: z.string().min(1),
  documentIds: z.array(z.string().uuid()).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, documentIds } = chatSchema.parse(body);

    // Retrieve relevant chunks
    const chunks = await retrieveChunksForQuery(question, documentIds || undefined);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have any relevant information in the provided documents to answer this question.",
        citations: [],
      });
    }

    // Build chat messages
    const messages = buildChatMessages(question, chunks);


    let answer: string;

    if (config.useOllama) {
      // Ollama chat API
      const url = `${config.ollamaHost.replace(/\/$/, '')}/api/chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.chatModel,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
          options: { temperature: 0.1 },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama chat failed (${res.status}): ${body}`);
      }

      const data = (await res.json()) as { message?: { content?: string }; error?: string };
      if (data.error) {
        throw new Error(`Ollama chat error: ${data.error}`);
      }
      answer = data.message?.content || "I couldn't generate a response.";
    } else {
      // OpenAI chat API
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required when USE_OLLAMA=false');
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: config.chatModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.1, // Low temperature for more grounded responses
      });

      answer = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    }

    // Extract citations
    const citations = extractCitations(answer, chunks);

    return NextResponse.json({
      answer,
      citations,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

