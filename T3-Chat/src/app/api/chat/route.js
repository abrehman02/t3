import { convertToModelMessages, streamText } from "ai";
import db from "@/lib/db";
import { MessageRole, MessageType } from "@prisma/client";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CHAT_SYSTEM_PROMPT } from "@/lib/prompt";

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
    const {
      chatId = null,
      messages: incomingMessages = [],
      model = "openai/gpt-3.5-turbo",
      skipUserMessage = false,
    } = await req.json();
    const safeModel =
      typeof model === "string" && model.trim()
        ? model
        : "openai/gpt-3.5-turbo";

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (chatId !== null && typeof chatId !== "string") {
      return new Response(
        JSON.stringify({ error: "chatId must be a string or null" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (
      !Array.isArray(incomingMessages) &&
      (typeof incomingMessages !== "object" || incomingMessages === null)
    ) {
      return new Response(
        JSON.stringify({ error: "messages must be an array or object" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
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
    let previousMessages = [];

    try {
      previousMessages = chatId
        ? await db.message.findMany({
            where: { chatId },
            orderBy: { createdAt: "asc" },
          })
        : [];
    } catch (error) {
      console.error("DB ERROR:", error);
      return new Response("DB Error", { status: 500 });
    }

    const uiMessages = previousMessages
      .map(convertStoredMessageToUI)
      .filter((msg) => msg !== null);

    const normalizedNewMessages = Array.isArray(incomingMessages)
      ? incomingMessages.filter(Boolean)
      : incomingMessages
      ? [incomingMessages]
      : [];

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
      model: provider.chat(safeModel),
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
                model: safeModel,
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
              model: safeModel,
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
