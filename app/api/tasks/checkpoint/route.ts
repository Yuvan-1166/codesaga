import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { CHECKPOINT_EVALUATION_SYSTEM_PROMPT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { explanation, conceptTags } = await req.json();

    if (!explanation || !conceptTags || !Array.isArray(conceptTags)) {
      return NextResponse.json(
        { error: 'Explanation and concept tags are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Call GROQ to evaluate the explanation
    const systemPrompt = CHECKPOINT_EVALUATION_SYSTEM_PROMPT(conceptTags, explanation);

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: explanation,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
        stream: false,
      });

      const responseText = completion.choices[0]?.message?.content || '';

      // Parse the first line for JSON
      const lines = responseText.split('\n');
      const firstLine = lines[0].trim();
      
      let pass = false;
      let messageText = responseText;

      try {
        const jsonMatch = firstLine.match(/\{.*"pass".*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          pass = parsed.pass === true;
          // Remove the JSON line from the message
          messageText = lines.slice(1).join('\n').trim();
        }
      } catch (error) {
        console.error('Error parsing checkpoint response:', error);
        // If parsing fails, treat as not passed
        pass = false;
      }

      return NextResponse.json({
        pass,
        message: messageText,
      });
    } catch (groqError) {
      console.error('GROQ API error in checkpoint:', groqError);
      // Fail silently - treat as not passed
      return NextResponse.json({
        pass: false,
        message: 'Can you tell me a bit more about what you built?',
      });
    }
  } catch (error) {
    console.error('Error in checkpoint evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate checkpoint' },
      { status: 500 }
    );
  }
}
