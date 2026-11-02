import { getLanguageIcon, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, FileCode, Plus, ChevronDown } from "lucide-react";

interface FileTab {
  id: string;
  name: string;
  language: string;
  isDirty: boolean;
}

interface Props {
  tabs: FileTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
}

export default function EditorSidebar({ tabs, activeTabId, onSelectTab, onAddTab }: Props) {
  return (
    <aside className="w-52 shrink-0 border-r border-[var(--cu-border)] bg-[var(--cu-bg-surface)] flex flex-col">
      {/* Explorer header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--cu-border)] shrink-0">
        <span className="text-[10px] font-semibold text-[var(--cu-text-muted)] uppercase tracking-wider">Explorer</span>
        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onAddTab}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {/* Workspace folder */}
          <div className="flex items-center gap-1.5 px-3 py-1">
            <ChevronDown className="h-3 w-3 text-[var(--cu-text-muted)]" />
            <Folder className="h-3.5 w-3.5 text-[var(--cu-amber)]" />
            <span className="text-xs text-[var(--cu-text-secondary)] font-medium">workspace</span>
          </div>

          {/* Files */}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-1.5 px-5 py-1 text-xs text-left transition-colors",
                tab.id === activeTabId
                  ? "bg-[var(--cu-blue)]/10 text-[var(--cu-text-primary)]"
                  : "text-[var(--cu-text-muted)] hover:bg-[var(--cu-bg-elevated)] hover:text-[var(--cu-text-secondary)]"
              )}
            >
              <span className="text-sm shrink-0">{getLanguageIcon(tab.language)}</span>
              <span className="truncate font-mono">{tab.name}</span>
              {tab.isDirty && <span className="ml-auto w-1 h-1 rounded-full bg-[var(--cu-blue)] shrink-0" />}
            </button>
          ))}

          {/* Add file hint */}
          <button
            onClick={onAddTab}
            className="w-full flex items-center gap-1.5 px-5 py-1 text-xs text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>New File</span>
          </button>
        </div>
      </ScrollArea>

      {/* Bottom section */}
      <div className="border-t border-[var(--cu-border)] p-3">
        <div className="text-[10px] text-[var(--cu-text-muted)]">
          <div>Files: {tabs.length}</div>
        </div>
      </div>
    </aside>
  );
}

