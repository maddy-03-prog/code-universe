# MAD IDE - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from modern developer tools
- **Primary References**: VS Code, GitHub, Linear, Replit
- **Design Principles**: Developer-first clarity, information density with breathing room, minimal distraction, efficient workflows

## Typography System

**Font Families**:
- Interface Text: Inter or -apple-system (system fonts)
- Code/Monospace: JetBrains Mono or 'Fira Code' via Google Fonts CDN

**Type Scale**:
- Page Title (MAD IDE): text-2xl font-bold
- Section Headers: text-lg font-semibold
- Body/Labels: text-sm
- Code Editor: text-sm (monospace)
- Buttons: text-sm font-medium

## Layout & Spacing System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section gaps: gap-4 to gap-8
- Editor container padding: p-6
- Button padding: px-4 py-2

**Layout Structure**:
- Full viewport application (100vh) with no scrolling on main container
- Header: Fixed height h-16 with logo, navigation
- Main workspace: Remaining viewport height using flex-1
- Split-panel layout for editor and console (resizable preferred)

## Core Components

**Header/Navigation Bar**:
- Logo: "MAD IDE" with architect credit "ARCHITECT: MADHAN" 
- Language selector dropdown (current language highlighted)
- Action buttons: Run Code, Save, New File, Settings
- Height: h-16, items centered vertically

**Language Selection Landing**:
- Grid layout: grid-cols-2 md:grid-cols-3 lg:grid-cols-5
- Language cards with: Icon (use Font Awesome for language icons), language name, short tagline
- Card spacing: gap-6, each card p-6
- Hover state: subtle elevation/border change

**Code Editor Panel**:
- Full-height container with line numbers
- Toolbar above editor: filename, language indicator, font size controls
- Monaco Editor integration recommended (Microsoft's web editor)
- Line number gutter: w-12
- Padding: p-4 around editor content

**Console/Output Panel**:
- Split horizontally or vertically based on viewport
- Tabs: Output, Errors, Input (for SQL/interactive)
- Monospace font for all output
- Auto-scroll to bottom on new output
- Clear button in corner

**File Explorer Sidebar** (Optional but recommended):
- Width: w-64 when expanded, w-12 when collapsed
- Tree structure for files/folders
- Icons for file types (Font Awesome file icons)
- Context menu on right-click

**Action Buttons**:
- Primary (Run): Prominent size px-6 py-2.5
- Secondary (Save, New): px-4 py-2
- Icon buttons (Settings, etc.): p-2 square
- Use Heroicons for UI actions

## Component Details

**Language Cards** (Landing):
```
Structure per card:
- Icon container: h-16 w-16 centered
- Language name: text-xl font-semibold, mt-4
- Description: text-sm, mt-2, opacity-80
- Border radius: rounded-lg
- Clickable area: entire card
```

**Editor Toolbar**:
- Height: h-12
- Items: filename (left), language badge (left), run button (right), settings (right)
- Spacing: px-4, items-center

**Status Bar** (Bottom):
- Height: h-8
- Info display: Line/column numbers, file encoding, language mode
- Background: slightly differentiated from main editor

**Modal Dialogs** (Settings, File ops):
- Max width: max-w-2xl
- Padding: p-6
- Rounded: rounded-xl
- Backdrop blur

## Interaction Patterns

**Code Execution Flow**:
1. User clicks Run button → button shows loading state
2. Code sent to backend → status indicator in console
3. Output streams to console in real-time
4. Completion indicated with status message

**File Operations**:
- Save: Auto-save indicator, manual save button
- New file: Modal to select language and filename
- Open: File tree selection or upload

**Responsiveness**:
- Desktop (lg): Side-by-side editor + console
- Tablet (md): Stacked with tabs to switch
- Mobile: Editor-first, console accessible via tab

## Icons & Assets

**Icon Library**: Font Awesome via CDN
- Language icons: fa-python, fa-java, etc.
- UI actions: play (run), save, folder, cog, etc.

**No Custom Graphics**: Use icon fonts for all visual elements

## Accessibility

- Keyboard shortcuts: Ctrl+Enter to run, Ctrl+S to save
- Focus indicators on all interactive elements
- High contrast maintained in code editor
- Screen reader labels for icon-only buttons
- ARIA labels for editor regions

## Key Features Layout

**Landing Page** (Language Selection):
- Header with MAD IDE branding + architect name
- Hero tagline: "Next Gen Development"
- Language grid below (5 cards)
- Footer: Quick links, version info

**IDE Workspace**:
- Persistent header across all views
- Main content: 60-70% editor, 30-40% console
- Resizable split with drag handle
- Maximize/minimize panels functionality

This creates a professional, efficient IDE interface that prioritizes code readability and workflow efficiency while maintaining visual appeal through consistent spacing and typography.