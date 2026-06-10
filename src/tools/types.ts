import type { TextToolResponse } from "../server/toolResponse.js";

export interface BookAssistantTool {
  name: string;
  description: string;
  inputSchema: object;
  handle(args: unknown): Promise<TextToolResponse>;
}
