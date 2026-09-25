# Screenrz Desktop 🚀

A high-performance, minimal, and fully local Windows desktop screen recording application built with **Electron**, **Vite**, **React**, **Tailwind CSS**, and an embedded **SQLite** database.

---

## ✨ Features

- **⚡ Zero Lag & Bandicam Efficiency**:
  - Direct hardware-accelerated video capture (VP8/WebM).
  - Throttled 1Hz UI rendering during recording to ensure 0% stutter in foreground games and apps.
  - Native Windows screen and application window capture via Electron's `desktopCapturer`.
- **💾 100% Local & Embedded SQLite**:
  - No cloud accounts, no SaaS tokens, no remote analytics.
  - All video metadata, tags, and settings are saved locally to `screenrz.db`.
- **📁 Custom Save Directory**:
  - Native Windows folder selection dialog to save recordings anywhere on disk (e.g., SSD, external drive, secondary HDD).
  - Quick 1-click "Open in File Explorer" and default player launcher.
- **🎨 Modern `shadcn-admin` Design System**:
  - Frameless Windows titlebar with native minimize, maximize, and close controls.
  - Collapsible slim sidebar with quick navigation (Studio, Library, Settings).
  - Recording library with both Grid and Data Table views.
  - Built-in video preview player modal.

---

## 🛠️ Tech Stack

- **Runtime**: Electron 34+
- **Bundler & Frontend**: Vite 6, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Database**: SQLite (Node 22 `DatabaseSync` embedded)

---

## 🚀 Getting Started

### Development
```bash
# Install dependencies
npm install

# Start development mode (Vite HMR + Electron)
npm run dev
```

### Production Build
```bash
# Build React UI and Electron main process
npm run build
```
