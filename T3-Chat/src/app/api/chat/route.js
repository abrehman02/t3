import { convertToModelMessages, streamText } from "ai";
import db from "@/lib/db";
import { MessageRole, MessageType } from "@prisma/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// initialize OpenRouter provider
const provider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function convertStoredMessageToUI(msg) {
  try {
    const parts = JSON.parse(msg.content);
    const validParts = parts.filter((part) => part.type === "text");

    if (validParts.length === 0) return null;

    return {
      id: msg.id,
      role: msg.messageRole.toLowerCase(),
      parts: validParts,
      createdAt: msg.createdAt,
    };
  } catch (e) {
    return {
      id: msg.id,
      role: msg.messageRole.toLowerCase(),
      parts: [{ type: "text", text: msg.content }],
      createdAt: msg.createdAt,
    };
  }
}

function extractPartsAsJSON(message) {
  if (message.parts && Array.isArray(message.parts)) {
    return JSON.stringify(message.parts);
  }

  const content = message.content || "";
  return JSON.stringify([{ type: "text", text: content }]);
}

export async function POST(req) {
   try 
   {
  //   // 🔐 1. AUTH CHECK
  //   const session = await auth.api.getSession({
  //     headers: await headers(),
  //   });

  //   if (!session?.user) {
  //     return new Response("Unauthorized", { status: 401 });
  //   }

  //   // 📦 2. PARSE REQUEST
  //   const {
  //     chatId,
  //     messages: newMessages,
  //     model,
  //     skipUserMessage,
  //   } = await req.json();

  //   // 🔐 3. CHAT OWNERSHIP CHECK
  //   if (chatId) {
  //     const chat = await db.chat.findFirst({
  //       where: {
  //         id: chatId,
  //         userId: session.user.id,
  //       },
  //     });

  //     if (!chat) {
  //       return new Response("Forbidden", { status: 403 });
  //     }
  //   }

    // 📚 4. LOAD PREVIOUS MESSAGES
    const previousMessages = chatId
      ? await db.message.findMany({
          where: { chatId },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const uiMessages = previousMessages
      .map(convertStoredMessageToUI)
      .filter((msg) => msg !== null);

    const normalizedNewMessages = Array.isArray(newMessages)
      ? newMessages
      : [newMessages];

    const allUIMessages = [...uiMessages, ...normalizedNewMessages];

    // 🤖 5. CONVERT TO MODEL FORMAT
    let modelMessages;

    try {
      modelMessages = convertToModelMessages(allUIMessages);
    } catch {
      modelMessages = allUIMessages
        .map((msg) => ({
          role: msg.role,
          content: msg.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("\n"),
        }))
        .filter((m) => m.content);
    }

    // 🚀 6. STREAM RESPONSE
    const result = streamText({
      model: provider.chat("openai/gpt-3.5-turbo"),
      messages: modelMessages,
      system: CHAT_SYSTEM_PROMPT,
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: allUIMessages,

      onFinish: async ({ responseMessage }) => {
        try {
          const messagesToSave = [];

          // 💬 Save user message
          if (!skipUserMessage) {
            const latestUserMessage =
              normalizedNewMessages[normalizedNewMessages.length - 1];

            if (latestUserMessage?.role === "user") {
              messagesToSave.push({
                chatId,
                content: extractPartsAsJSON(latestUserMessage),
                messageRole: MessageRole.USER,
                model,
                messageType: MessageType.NORMAL,
              });
            }
          }

          // 🤖 Save assistant message
          if (responseMessage?.parts?.length > 0) {
            messagesToSave.push({
              chatId,
              content: extractPartsAsJSON(responseMessage),
              messageRole: MessageRole.ASSISTANT,
              model,
              messageType: MessageType.NORMAL,
            });
          }

          if (messagesToSave.length > 0) {
            await db.message.createMany({
              data: messagesToSave,
            });
          }
        } catch (error) {
          console.error("❌ Error saving messages:", error);
        }
      },
    });
  } catch (error) {
    console.error("❌ API Route Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
