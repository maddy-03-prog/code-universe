import MonacoEditorReact, { type OnMount, type OnChange } from "@monaco-editor/react";
import { useRef, useCallback, useEffect } from "react";
import type { editor } from "monaco-editor";

interface Props {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  onSelectionChange?: (text: string) => void;
  fontSize?: number;
  wordWrap?: "on" | "off";
  minimap?: boolean;
  lineNumbers?: boolean;
  tabSize?: number;
  fontFamily?: string;
  editorTheme?: "cu-dark" | "vs-dark" | "vs" | "hc-black";
  readOnly?: boolean;
}

export default function MonacoEditor({
  value, language, onChange, onSelectionChange,
  fontSize = 14, wordWrap = "on", minimap = false, lineNumbers = true,
  tabSize = 2, fontFamily = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  editorTheme = "cu-dark", readOnly = false
}: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // Monaco dark theme matching our design system
    monaco.editor.defineTheme("cu-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A7384", fontStyle: "italic" },
        { token: "keyword", foreground: "60A5FA" },
        { token: "string", foreground: "34D399" },
        { token: "number", foreground: "FB923C" },
        { token: "type", foreground: "C084FC" },
        { token: "function", foreground: "93C5FD" },
        { token: "variable", foreground: "E2E8F0" },
      ],
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#E2E8F0",
        "editor.lineHighlightBackground": "#161b22",
        "editor.selectionBackground": "#1D4ED840",
        "editorLineNumber.foreground": "#404759",
        "editorLineNumber.activeForeground": "#8B98A9",
        "editorCursor.foreground": "#3B82F6",
        "editor.selectionHighlightBackground": "#1D4ED820",
        "editorBracketMatch.background": "#3B82F620",
        "editorBracketMatch.border": "#3B82F6",
        "editorGutter.background": "#0d1117",
        "scrollbarSlider.background": "#2D364580",
        "scrollbarSlider.hoverBackground": "#2D3645",
        "editorWidget.background": "#161b22",
        "editorWidget.border": "#21262d",
        "editorSuggestWidget.background": "#161b22",
        "editorSuggestWidget.border": "#21262d",
        "editorSuggestWidget.selectedBackground": "#1D4ED840",
        "input.background": "#161b22",
        "input.border": "#21262d",
      },
    });
    monaco.editor.setTheme(editorTheme);

    // Selection tracking for AI panel
    ed.onDidChangeCursorSelection((e) => {
      const selection = ed.getModel()?.getValueInRange(e.selection) || "";
      onSelectionChange?.(selection);
    });

    // Keyboard shortcuts
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Trigger run via DOM (handled in parent)
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    });
  }, [editorTheme, onSelectionChange]);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(editorTheme);
  }, [editorTheme]);

  return (
    <MonacoEditorReact
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily,
        fontLigatures: true,
        lineNumbers: lineNumbers ? "on" : "off",
        roundedSelection: true,
        scrollBeyondLastLine: false,
        readOnly,
        minimap: { enabled: minimap },
        wordWrap,
        automaticLayout: true,
        tabSize,
        insertSpaces: true,
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        inlineSuggest: { enabled: true },
        formatOnPaste: true,
        formatOnType: false,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        overviewRulerLanes: 0,
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
      loading={
        <div className="h-full w-full flex items-center justify-center bg-[#0d1117]">
          <div className="text-sm text-[var(--cu-text-muted)] font-mono">Initializing editor...</div>
        </div>
      }
    />
  );
}
