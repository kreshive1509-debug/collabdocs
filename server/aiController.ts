import express, { Request, Response, NextFunction } from "express";
import { AIService } from "./aiService";
import { DocumentDBService } from "./db";
import { logAuditEvent } from "./securityController";

export const aiRouter = express.Router();

// Simulated AI conversation histories and credits tracker (Should ideally be moved to Firestore)
const AI_HISTORY_STORE: Array<{
  id: string;
  userId: string;
  docId: string | null;
  task: string;
  prompt: string;
  response: string;
  createdAt: string;
}> = [];

// Helper middleware to verify premium plan for AI access
async function verifyAIPlan(req: Request, res: Response, next: NextFunction) {
  const userObj = (req as any).user;
  if (!userObj) {
    return res.status(401).json({ error: "Unauthorized access: Please sign in." });
  }

  try {
    const dbUser = await DocumentDBService.getUserById(userObj.id || userObj.uid);
    if (!dbUser || dbUser.plan === "free") {
      return res.status(403).json({
        error: "Premium plan required",
        premiumLocked: true,
        message: "Upgrade to Pro or Enterprise membership to unlock unlimited access to our full-stack Gemini AI suite."
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify user plan status." });
  }
}

// 1. Core Completion Dispatcher
aiRouter.post("/completion", verifyAIPlan, async (req: Request, res: Response) => {
  const { docId, task, prompt, textContext } = req.body;
  const userObj = (req as any).user;

  try {
    let systemInstruction = "You are a senior enterprise collaboration AI Assistant for CollabDocs.";
    let finalPrompt = "";

    // 20+ distinct AI prompt builders
    switch (task) {
      case "summarize":
        systemInstruction += " Your task is to provide an executive summary, highlighting key milestones and technical parameters.";
        finalPrompt = `Summarize the following document content concisely:\n\n${textContext}`;
        break;
      case "rewrite":
        systemInstruction += " Your task is to rewrite the text to make it highly engaging while keeping all technical details intact.";
        finalPrompt = `Rewrite the following text:\n\n${textContext}`;
        break;
      case "improve":
        systemInstruction += " Your task is to improve the writing quality, elevate clarity, and make it concise.";
        finalPrompt = `Improve the writing of the following paragraph:\n\n${textContext}`;
        break;
      case "grammar":
        systemInstruction += " Your task is to proofread, fix grammar mistakes, punctuation, and improve phrasing.";
        finalPrompt = `Correct the grammar of the following text:\n\n${textContext}`;
        break;
      case "continue_writing":
        systemInstruction += " Your task is to continue the document narrative seamlessly, matching the style and technical tone.";
        finalPrompt = `Based on this document context:\n\n${textContext}\n\nContinue writing the next logical section.`;
        break;
      case "change_tone":
        systemInstruction += " Your task is to shift the style of the text.";
        finalPrompt = `Transform the tone of this text to be ultra-professional and formal:\n\n${textContext}`;
        break;
      case "translate":
        systemInstruction += " Your task is to translate the text carefully while keeping formatting unchanged.";
        finalPrompt = `Translate the following text to Spanish (or keep technical terms in English):\n\n${textContext}`;
        break;
      case "meeting_notes":
        systemInstruction += " Your task is to transform meeting transcripts into beautiful, production-ready markdown meeting notes.";
        finalPrompt = `Create professional meeting notes from these records:\n\n${textContext || prompt}`;
        break;
      case "action_items":
        systemInstruction += " Your task is to analyze document files and extract high-priority action items with owners.";
        finalPrompt = `Extract action items as a markdown checklist from this draft:\n\n${textContext || prompt}`;
        break;
      case "generate_table":
        systemInstruction += " Your task is to structure data in a clean, legible Markdown table format.";
        finalPrompt = `Generate a markdown table describing this information:\n\n${prompt}`;
        break;
      case "bullet_points":
        systemInstruction += " Your task is to structure arguments in concise, high-impact bullet points.";
        finalPrompt = `Convert this text into key bullet points:\n\n${textContext || prompt}`;
        break;
      case "generate_blog":
        systemInstruction += " Your task is to write an engaging blog article outline and content.";
        finalPrompt = `Generate a detailed blog post on this topic:\n\n${prompt}`;
        break;
      case "generate_email":
        systemInstruction += " Your task is to draft high-converting professional business or notification emails.";
        finalPrompt = `Write a professional email draft for:\n\n${prompt}`;
        break;
      case "generate_report":
        systemInstruction += " Your task is to formulate formal engineering and administrative report specifications.";
        finalPrompt = `Draft an architecture analysis report detailing:\n\n${prompt}`;
        break;
      case "explain_text":
        systemInstruction += " Your task is to provide clear, simple explanations of complex selections.";
        finalPrompt = `Explain the meaning of this selection:\n\n${textContext}`;
        break;
      case "code_explain":
        systemInstruction += " Your task is to explain software architecture code, data structures, or code blocks step-by-step.";
        finalPrompt = `Provide a thorough walkthrough and explanation of this code snippet:\n\n${textContext}`;
        break;
      case "code_documentation":
        systemInstruction += " Your task is to generate complete code comments and docstrings for code files.";
        finalPrompt = `Write comprehensive documentation comments for this source code:\n\n${textContext}`;
        break;
      case "document_search":
        systemInstruction += " Your task is to perform an intelligent search over the user's document vector text space.";
        finalPrompt = `Search details about "${prompt}" in this content:\n\n${textContext}`;
        break;
      case "ask_question":
        systemInstruction += " Answer the user's questions about the document draft with high accuracy and citations.";
        finalPrompt = `Document: \n${textContext}\n\nQuestion: ${prompt}`;
        break;
      case "quick_command":
        systemInstruction += " Execute user quick prompt commands swiftly and structure the output beautifully.";
        finalPrompt = `Execute this command on the document context:\nCommand: ${prompt}\n\nContext:\n${textContext}`;
        break;
      default:
        // Default custom chat
        systemInstruction += " Assist the user with document writing, formatting, and co-authoring brainstorming.";
        finalPrompt = prompt;
    }

    const aiResponse = await AIService.generateCompletion(finalPrompt, systemInstruction);

    // Record in history log
    const historyItem = {
      id: `ai-task-${Date.now()}`,
      userId: userObj.id || userObj.uid,
      docId: docId || null,
      task: task || "custom_chat",
      prompt: prompt || finalPrompt.substring(0, 100),
      response: aiResponse,
      createdAt: new Date().toISOString()
    };
    AI_HISTORY_STORE.push(historyItem);

    // Log security audit log for AI operations
    await logAuditEvent(
      userObj.id || userObj.uid,
      userObj.displayName || "Subscriber",
      "ai_tool_used",
      `Executed AI helper task '${task}' for document [${docId || "detached"}]`,
      docId || "none"
    );

    return res.json({ response: aiResponse, task, historyId: historyItem.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "AI Service failure." });
  }
});

// 2. Fetch User AI Session History
aiRouter.get("/history", verifyAIPlan, (req: Request, res: Response) => {
  const userObj = (req as any).user;
  const history = AI_HISTORY_STORE.filter(h => h.userId === (userObj.id || userObj.uid));
  return res.json(history);
});

// 3. Clear History
aiRouter.delete("/history", verifyAIPlan, (req: Request, res: Response) => {
  const userObj = (req as any).user;
  const userId = userObj.id || userObj.uid;
  for (let i = AI_HISTORY_STORE.length - 1; i >= 0; i--) {
    if (AI_HISTORY_STORE[i].userId === userId) {
      AI_HISTORY_STORE.splice(i, 1);
    }
  }
  return res.json({ success: true, message: "AI logs cleared." });
});
