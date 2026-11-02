import { useState, useEffect, useRef, useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppLayout from "@/components/AppLayout";
import {
  Play, RefreshCw, Download, Monitor, Smartphone, Tablet,
  Globe, Code, Palette, Terminal, AlertCircle, ChevronLeft
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

const MonacoEditor = lazy(() => import("@/components/editor/MonacoEditor"));

const INITIAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
</head>
<body>
  <h1>Hello, Playground!</h1>
  <p>Edit HTML, CSS, and JS to see live changes.</p>
  <button id="btn">Click me</button>
  <p id="output"></p>
</body>
</html>`;

const INITIAL_CSS = `body {
  font-family: 'Inter', sans-serif;
  background: #0d1117;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  margin: 0;
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #3b82f6;
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

p {
  color: #94a3b8;
  margin-bottom: 1.5rem;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #2563eb;
}

#output {
  color: #34d399;
  font-family: monospace;
}`;

const INITIAL_JS = `const btn = document.getElementById('btn');
const output = document.getElementById('output');
let count = 0;

if (btn && output) {
  btn.addEventListener('click', () => {
    count++;
    output.textContent = \`Button clicked \${count} time\${count !== 1 ? 's' : ''}!\`;
    console.log('Button clicked:', count);
  });
}

console.log('Script loaded successfully!');`;

type PreviewSize = "desktop" | "tablet" | "mobile";

const previewSizes: Record<PreviewSize, { width: string; icon: typeof Monitor }> = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "375px", icon: Smartphone },
};

export default function Playground() {
  const [html, setHtml] = useState(INITIAL_HTML);
  const [css, setCss] = useState(INITIAL_CSS);
  const [js, setJs] = useState(INITIAL_JS);
  const [activeEditor, setActiveEditor] = useState<"html" | "css" | "js">("html");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; msg: string }>>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("source") !== "editor") return;
    const storedSource = sessionStorage.getItem("code-universe-playground-source");
    sessionStorage.removeItem("code-universe-playground-source");
    if (!storedSource) return;
    try {
      const source: unknown = JSON.parse(storedSource);
      if (typeof source !== "object" || source === null || !("language" in source) || !("code" in source) ||
        typeof source.language !== "string" || typeof source.code !== "string") return;
      if (source.language === "html") {
        setHtml(source.code);
        setActiveEditor("html");
      } else if (source.language === "css") {
        setCss(source.code);
        setActiveEditor("css");
      }
    } catch {
      setConsoleLogs([{ type: "error", msg: "Could not load the source file from the editor." }]);
    }
  }, []);

  const buildSrcdoc = useCallback(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
${html.replace(/^<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
<script>
// Intercept console
const _log = console.log;
const _warn = console.warn;
const _error = console.error;
const _info = console.info;
function post(type, args) {
  window.parent.postMessage({ type: 'console', level: type, msg: args.map(String).join(' ') }, '*');
}
console.log = (...a) => { _log(...a); post('log', a); };
console.warn = (...a) => { _warn(...a); post('warn', a); };
console.error = (...a) => { _error(...a); post('error', a); };
console.info = (...a) => { _info(...a); post('info', a); };
window.onerror = (msg, src, line, col) => {
  post('error', [\`\${msg} (line \${line}:\${col})\`]);
};
</script>
<script>${js}</script>
</body>
</html>`;
  }, [html, css, js]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.type !== "console") return;
      if (typeof event.data.level === "string" && typeof event.data.msg === "string") {
        setConsoleLogs((prev) => [...prev.slice(-99), { type: event.data.level, msg: event.data.msg }]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Auto-refresh on change
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildSrcdoc();
    }
  }, [buildSrcdoc]);

  const refresh = () => {
    setPreviewKey((k) => k + 1);
    setConsoleLogs([]);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildSrcdoc();
    }
  };

  const downloadProject = async () => {
    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("style.css", css);
    zip.file("script.js", js);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playground-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const editorValues = { html, css, js };
  const editorLangs = { html: "html", css: "css", js: "javascript" };
  const editorSetters = { html: setHtml, css: setCss, js: setJs };
  const currentValue = editorValues[activeEditor];
  const currentLang = editorLangs[activeEditor];

  return (
    <AppLayout>
      <div className="h-full flex flex-col">

        {/* Toolbar */}
        <div className="h-11 flex items-center gap-2 px-4 border-b border-[var(--cu-border)] bg-[var(--cu-bg-surface)] shrink-0">
          <Link href="/">
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-[var(--cu-violet)]" />
            <span className="text-sm font-semibold text-[var(--cu-text-primary)]">Web Playground</span>
          </div>

          <div className="ml-4 flex items-center gap-0.5">
            {(["html", "css", "js"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveEditor(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors",
                  activeEditor === tab
                    ? "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]"
                    : "text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)]"
                )}
              >
                {tab === "html" && <Globe className="h-3 w-3" />}
                {tab === "css" && <Palette className="h-3 w-3" />}
                {tab === "js" && <Code className="h-3 w-3" />}
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Preview size */}
            <div className="flex items-center gap-0.5 border border-[var(--cu-border)] rounded-md p-0.5">
              {(Object.entries(previewSizes) as [PreviewSize, any][]).map(([size, conf]) => (
                <button
                  key={size}
                  onClick={() => setPreviewSize(size)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    previewSize === size ? "bg-[var(--cu-bg-overlay)] text-[var(--cu-blue)]" : "text-[var(--cu-text-muted)]"
                  )}
                >
                  <conf.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <Button size="sm" variant="ghost" className="h-7" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>

            <Button size="sm" variant="secondary" className="h-7" onClick={downloadProject}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>

        {/* Main panels */}
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Editor panel */}
          <Panel defaultSize={45} minSize={25}>
            <div className="h-full flex flex-col">
              <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-[var(--cu-text-muted)]">Loading...</div>}>
                <MonacoEditor
                  key={activeEditor}
                  value={currentValue}
                  language={currentLang}
                  onChange={(v) => editorSetters[activeEditor](v || "")}
                  fontSize={13}
                  minimap={false}
                />
              </Suspense>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-[var(--cu-border)] hover:bg-[var(--cu-blue)]/50 transition-colors cursor-col-resize" />

          {/* Preview + console panel */}
          <Panel defaultSize={55} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Browser preview */}
              <Panel defaultSize={75} minSize={40}>
                <div className="h-full flex flex-col bg-[var(--cu-bg-surface)]">
                  <div className="h-7 flex items-center gap-2 px-3 border-b border-[var(--cu-border)] shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--cu-red)]/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--cu-amber)]/60" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--cu-green)]/60" />
                    </div>
                    <span className="text-[10px] text-[var(--cu-text-muted)] font-mono flex-1 text-center">preview</span>
                  </div>
                  <div className="flex-1 flex items-start justify-center overflow-auto bg-white">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: previewSizes[previewSize].width, minWidth: 0 }}
                    >
                      <iframe
                        ref={iframeRef}
                        key={previewKey}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-modals allow-forms"
                        title="Preview"
                      />
                    </div>
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-[var(--cu-border)] hover:bg-[var(--cu-blue)]/50 transition-colors cursor-row-resize" />

              {/* Console */}
              <Panel defaultSize={25} minSize={15}>
                <div className="h-full flex flex-col bg-[var(--cu-bg-surface)]">
                  <div className="h-7 flex items-center gap-2 px-3 border-b border-[var(--cu-border)] shrink-0">
                    <Terminal className="h-3.5 w-3.5 text-[var(--cu-text-muted)]" />
                    <span className="text-xs text-[var(--cu-text-muted)]">Console</span>
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="ml-auto text-[10px] text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)]"
                    >Clear</button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                      {consoleLogs.length === 0 ? (
                        <p className="text-[10px] text-[var(--cu-text-muted)] font-mono p-2">Console output will appear here...</p>
                      ) : (
                        consoleLogs.map((log, i) => (
                          <div key={i} className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded",
                            log.type === "error" ? "text-[var(--cu-red)] bg-[var(--cu-red)]/5" :
                            log.type === "warn" ? "text-[var(--cu-amber)]" :
                            "text-[var(--cu-text-secondary)]"
                          )}>
                            <span className="text-[var(--cu-text-muted)] mr-2">›</span>
                            {log.msg}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </AppLayout>
  );
}
