export type SupportedLanguage =
  | "python"
  | "c"
  | "cpp"
  | "java"
  | "javascript"
  | "typescript"
  | "r"
  | "html"
  | "css"
  | "sql"
  | "json";

export interface ExecutionRequest {
  language: SupportedLanguage;
  code: string;
  stdin?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memory?: number;
  status: "success" | "error" | "timeout" | "compile_error" | "memory_limit" | "configuration_error" | "service_error" | "unsupported";
  compilationOutput?: string;
  errorType?: "Syntax Error" | "Compilation Error" | "Runtime Error" | "Input Error" | "Time Limit Exceeded" | "Memory Limit Error" | "Execution Service Error" | "Configuration Error" | "Unsupported Language/Runtime";
  runtime?: string;
  runtimeVersion?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface AIRequest {
  action: "explain" | "debug" | "optimize" | "generate" | "convert" | "document" | "suggest" | "error" | "ask";
  code: string;
  language: SupportedLanguage;
  context?: string;
  targetLanguage?: SupportedLanguage;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AIResponse {
  result: string;
  tokens?: number;
}
