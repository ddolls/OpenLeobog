> [!IMPORTANT]
> ### Upstream & Core Origins Attribution
> **All the code in this repository originates from and is based on the [openaula](https://github.com/not-ayan/openaula) project created by [Ayan Biswas](https://github.com/not-ayan).**
> - **OpenAula Repository**: [https://github.com/not-ayan/openaula](https://github.com/not-ayan/openaula)
> - **Ayan Biswas GitHub**: [https://github.com/not-ayan](https://github.com/not-ayan)
> 
> We extend our deepest gratitude and full credit to [Ayan Biswas](https://github.com/not-ayan) for his groundbreaking reverse-engineering work, protocol research, and foundational codebase that made this WebHID configurator possible.

# OpenLeobog // Leobog Hi75c Pro WebHID Configurator

[![Deploy with Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=open-leobog)](https://open-leobog.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)](https://vitejs.dev/)

> A driverless, high-performance WebHID browser configurator, diagnostics toolkit, and lighting management suite built specifically for the **LEOBOG Hi75c Pro** mechanical keyboard (SinoWealth architecture: VID `0x258A`, PID `0x010C`).

🌐 **Live Web App**: [https://open-leobog.vercel.app/](https://open-leobog.vercel.app/)

Directly configure your keyboard in any modern Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera) with **zero background software installations**, **zero intrusive drivers**, and **100% client-side privacy**.

---

## Key Features

### 1. Authentic 75% ANSI Physical Matrix Layout
- **Pixel-Perfect Hardware Alignment**: Accurately mapped to the physical Leobog Hi75c Pro 81-key + Rotary Knob chassis:
  - **Row 1**: `Esc`, `F1`–`F12`, and `Rotary Volume Knob` at the top right.
  - **Row 2**: `~` to `Backspace`, followed by `Delete` (#85).
  - **Row 3**: `Tab` to `\`, followed by `End` (#88).
  - **Row 4**: `Caps Lock` to `Enter`, followed by `PgUp` (#86).
  - **Row 5**: `LShift` to `RShift`, `Up Arrow (▲)` (#82), and `PgDn` (#87).
  - **Row 6**: `LCtrl`, `Win`, `LAlt`, `Space (6.25u)`, `RAlt`, `Fn`, `RCtrl`, `Left Arrow (◄)` (#77), `Down Arrow (▼)` (#83), and `Right Arrow (►)` (#89).

### 2. Interactive Rotary Encoder Volume Knob
- **Bi-Directional Spin Animation**: Smooth real-time rotation rendering when turned clockwise (Volume Up, +18°) and counter-clockwise (Volume Down, -18°).
- **Press & Mute State**: Depressed scale animation with neon cyan glow upon clicking or pressing the knob.
- **Dynamic Floating Badge**: Instant visual indicator badge (`VOL ▲`, `VOL ▼`, `MUTE`).
- **Interactive Browser Controls**: Test rotation using the mouse wheel on the virtual knob, or click to trigger mute.

### 3. Terms & Conditions Agreement & Dual Operating Modes
- **Side-by-Side Launch Modal**: Clean 2-column layout combining Terms of Service with Operating Mode selection.
- **Clear Agreement & Disclaimer**: Outlines hardware WebHID direct communication, self-modification responsibility, zero-telemetry local privacy, and independent community status.
- **Safe Mode**:
  - Styled in signature Cyan matching the agreement box.
  - Read-only protection mode (`Safe Mode, less feature can be change`).
  - EEPROM writing and experimental streaming features are safely locked.
- **Dev Mode**:
  - Styled in Amber/Orange with PIN authorization (`270892`).
  - Unlocks full hardware flash write access, key remapping, and experimental features.

### 4. Key Remapping & Shortcut Builder
- **Single Key Remap**: Remap any physical key to standard HID usages, navigation keys, or media controls.
- **Multi-Modifier Shortcut Builder**: Create custom combinations (e.g., `Ctrl + Shift + C`, `Win + Alt + V`).
- **Productivity Presets**: One-click quick mapping for common shortcuts (Copy, Paste, Cut, Undo, Redo, Save).
- **One-Click Win & Alt Swap**: Instantly swap Windows and Left Alt keys.

### 5. RGB Lighting Suite
- **Hardware Ambience**: Real-time effect controls with curated, stable factory animations.
- **Per-Key RGB Canvas Painter**: Interactive matrix painter with customizable color swatches and gradient generators.
- **Direct Software Stream Animations (BETA)**: High-framerate frame streaming engine for custom dynamic animations.

### 6. Hardware Repair & Diagnostics Toolkit (BETA)
- **Surgical Fn Key Recovery**: Restores corrupted Fn key mapping (Matrix index 53 -> `[13, 0, 0, 0]`) without affecting OS flags or user keymaps.
- **Win Key Unstick**: Resets Windows key and clears hardware Win-Lock state.
- **Factory Baseline Snapshots**: Export and import complete 1024-byte EEPROM state snapshots in JSON format with checksum verification.
- **Live HID Diagnostics**: Real-time WebHID Feature Report inspector and DOM event logging.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | Vanilla CSS + [Tailwind CSS](https://tailwindcss.com/) (Cyber Dark Aesthetic) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Hardware Protocol** | Browser [WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) (USB Feature Reports) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Hardware Architecture

| Specification | Value |
|---|---|
| **Target Keyboard** | LEOBOG Hi75c Pro (75% ANSI Layout) |
| **USB Vendor ID (VID)** | `0x258A` (SinoWealth) |
| **USB Product ID (PID)** | `0x010C` |
| **Firmware Protocol** | SinoWealth Planar LED & Matrix Table |
| **Report ID** | `6` (Feature Report Length: 519 bytes) |
| **Base Table Read CMD** | `0x83` |
| **Base Table Write CMD** | `0x05` |
| **Planar LED CMD** | `0x06` |
| **Direct LED Frame CMD** | `0x08` |

---

## Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- Chromium-based browser with WebHID enabled (Chrome, Edge, Brave, Opera)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ddolls/OpenLeobog.git

# 2. Navigate to project directory
cd OpenLeobog

# 3. Install dependencies
npm install

# 4. Start local Vite development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build

```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Connecting Your Keyboard

1. Connect your **LEOBOG Hi75c Pro** to your computer via USB Type-C cable (ensure keyboard is in wired mode).
2. Close any official LEOBOG background desktop software to prevent USB communication conflicts.
3. Open [https://open-leobog.vercel.app/](https://open-leobog.vercel.app/) in Google Chrome or Microsoft Edge.
4. Click **Connect HID** and select your keyboard from the browser permission prompt.

---

## Credits & Acknowledgements

- **Created with ❤️ by [Mickey Montana](https://saweria.co/itsmickeyyy)**
  - ☕ Buy me a coffee: [https://saweria.co/itsmickeyyy](https://saweria.co/itsmickeyyy)
  - TikTok: [@itsmickeymontana](https://www.tiktok.com/@itsmickeymontana)
  - Facebook: [Mickey Montana](https://www.facebook.com/itsmickeymontana)
  - Instagram: [@itsmickeymontana](https://www.instagram.com/itsmickeymontana/)
- **Core Architecture Credits**: [Ayan Biswas (openaula)](https://github.com/not-ayan/openaula)

---

## License

This project is licensed under the [MIT License](LICENSE).
