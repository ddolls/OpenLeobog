# LEOBOG Hi75c Pro WebHID Configurator

Driverless WebHID browser configurator and management suite for the **LEOBOG Hi75c Pro** mechanical keyboard (SinoWealth architecture: VID `0x258A`, PID `0x010C`).

Directly configure your keyboard in modern Chromium-based browsers (Chrome, Edge, Brave, Opera) with zero software installations or intrusive background drivers.

---

## Features

- **WebHID Zero-Driver Communication**: Direct low-level USB Feature Report communication (CMD `0x05`, `0x06`, `0x08`, Report ID `6`) over browser WebHID API.
- **Physical Key Matrix View**: Interactive 75% ANSI layout with real-time visual feedback, matrix offset inspector, and diagnostic input visualizer.
- **Key Remapping & Shortcut Inspector**:
  - Single HID usage remap.
  - Multi-key shortcut/combo builder (Ctrl, Shift, Alt, Win combinations).
  - Common developer & productivity shortcut presets.
  - One-click Win & Alt swap.
- **RGB Lighting Suite**:
  - Full hardware effect controls (Rainbow, Ripple, Breathing, Neon Stream, Laser, etc.) with brightness and speed sliders.
  - Interactive Per-Key RGB Canvas Painter.
  - Software Stream Animations Engine (BETA) for high-framerate dynamic animations.
- **Backup & Recovery Strategy (BETA)**:
  - Known-good Factory Windows Baseline JSON snapshot backup.
  - Surgical Fn Recovery (matrix index 53 restore without touching OS flags).
  - Windows ↔ Mac EEPROM flag diff inspector tool.
- **Dual Operating Modes**:
  - **Guest Mode**: Safe read-only mode where risky EEPROM write actions and experimental streaming are locked.
  - **Dev Mode**: PIN-protected full hardware access with safety confirmation.

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS / Modern Cyber Dark Aesthetic
- **Icons**: Lucide React
- **Protocol**: WebHID API

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/ddolls/Leobog-Hi75c-Pro-WebHID.git

# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build production bundle for Vercel / Cloudflare / Netlify
npm run build
```

---

## Vercel Deployment

This project is pre-configured and 100% ready for instant deployment on [Vercel](https://vercel.com):
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## Credits & Acknowledgements

- **Created with ❤️ by [Mickey Montana](https://saweria.co/itsmickeyyy)**
  - TikTok: [@itsmickeymontana](https://www.tiktok.com/@itsmickeymontana)
  - Facebook: [Mickey Montana](https://www.facebook.com/itsmickeymontana)
  - Instagram: [@itsmickeymontana](https://www.instagram.com/itsmickeymontana/)
- **Core Architecture Credits**: [Ayan Biswas (openaula)](https://github.com/not-ayan/openaula)

