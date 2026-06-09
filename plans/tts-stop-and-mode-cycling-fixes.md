# TTS Stop Button & Mode Cycling Fixes

## Issue 1: TTS Stop Button Broken + Missing "Click Again to Disable" Flow

### Current Behavior

- The `VolumeX` stop button in [`ChatTextArea.tsx`](webview-ui/src/components/chat/ChatTextArea.tsx:1686) appears only while `isTtsPlaying` is `true`.
- Clicking it sends `vscode.postMessage({ type: "stopTts" })`.
- The backend handler in [`webviewMessageHandler.ts`](src/core/webview/webviewMessageHandler.ts:1953) calls `stopTts()` but does **not** immediately send a `ttsStop` message back to the webview. It relies on the async process rejection to eventually trigger `onStop`.
- The button often "flashes once" and disappears because the TTS state becomes desynchronized between backend and frontend.

### Root Causes Identified

1. **No immediate `ttsStop` acknowledgment from backend**

    - When the user clicks stop, [`stopTts()`](src/utils/tts.ts:330) kills processes but the webview only learns about it when the killed process's promise rejects and propagates through `processQueue()` -> `playTts()` `.catch()` -> `onStop()`.
    - If the audio player process (e.g., `afplay`, `paplay`, `ffplay`) is not properly tracked/killed, the promise may hang and `onStop` never fires.

2. **Piper TTS audio player cannot be stopped**

    - [`stopPiperTts()`](src/utils/piper-tts.ts:335) only kills `currentPiperProcess` (the Piper synthesis process).
    - Once Piper finishes generating the WAV, [`playWav()`](src/utils/piper-tts.ts:173) spawns a separate audio player process (`afplay`, `paplay`, `ffplay`, or PowerShell) that is **not stored anywhere**.
    - Calling `stopTts()` while the WAV is playing does nothing because the audio player process is untracked.

3. **Button disappears after stopping, so user can't "click again to disable"**
    - The `VolumeX` button is conditionally rendered on `isTtsPlaying`.
    - After `ttsStop` is received, `isTtsPlaying` becomes `false` and the button vanishes.
    - The user previously had a two-step interaction: click once to stop audio, click again to disable TTS entirely.

### Expected Behavior

1. Clicking the stop button **immediately stops** the currently playing TTS audio.
2. The backend **immediately sends** `ttsStop` to the webview so the UI state syncs.
3. After stopping, the button **remains visible** (or transforms) so the user can click a **second time** to toggle `ttsEnabled` off entirely.

### Files to Modify

| File                                                                                                      | Change                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`src/utils/piper-tts.ts`](src/utils/piper-tts.ts)                                                        | Track the audio player process spawned by `playWav()` and kill it in `stopPiperTts()`.                                     |
| [`src/utils/tts.ts`](src/utils/tts.ts)                                                                    | Ensure `stopTts()` reliably triggers the `onStop` callback (or send `ttsStop` directly from the message handler).          |
| [`src/core/webview/webviewMessageHandler.ts`](src/core/webview/webviewMessageHandler.ts:1953)             | Send `ttsStop` message immediately when handling `stopTts`, in addition to calling `stopTts()`.                            |
| [`webview-ui/src/components/chat/ChatTextArea.tsx`](webview-ui/src/components/chat/ChatTextArea.tsx:1686) | Keep the stop button visible after `ttsStop`; second click should post `updateSettings { ttsEnabled: false }` + `stopTts`. |
| [`webview-ui/src/components/chat/TtsToggle.tsx`](webview-ui/src/components/chat/TtsToggle.tsx:55)         | May need adjustments if the stop button takes over the "disable TTS" responsibility.                                       |

---

## Issue 2: "Review" Mode Appears in Ctrl+. Cycling

### Current Behavior

- `Ctrl+.` (and `Shift+Ctrl+.`) cycles through modes using [`switchToNextMode()`](webview-ui/src/components/chat/ChatView.tsx:1533) / [`switchToPreviousMode()`](webview-ui/src/components/chat/ChatView.tsx:1542).
- These functions call [`getAllModes(customModes)`](src/shared/modes.ts:71), which includes the built-in `review` mode defined in [`DEFAULT_MODES`](packages/types/src/mode.ts:142).
- The user reports `review` "appeared back" in the cycle, suggesting it was previously excluded.

### Expected Behavior

- `review` mode should **remain available** in the mode dropdown and via completion suggestions (e.g., "Start code review").
- `review` mode should **be excluded** from the `Ctrl+.` keyboard shortcut cycling.

### Files to Modify

| File                                                                                              | Change                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`webview-ui/src/components/chat/ChatView.tsx`](webview-ui/src/components/chat/ChatView.tsx:1533) | In `switchToNextMode` and `switchToPreviousMode`, filter `review` out of the `allModes` array before computing the next index. |

### Suggested Implementation

In `ChatView.tsx`, wrap `getAllModes(customModes)` with a filter:

```typescript
const cycleModes = getAllModes(customModes).filter((m) => m.slug !== "review")
```

Use `cycleModes` instead of `allModes` in both `switchToNextMode` and `switchToPreviousMode`.

---

## Acceptance Criteria

- [ ] Clicking the TTS stop button immediately halts audio playback (Piper, system TTS, and Linux espeak).
- [ ] After stopping, the webview receives `ttsStop` immediately and UI state syncs.
- [ ] The stop button remains visible after audio stops; a second click disables TTS entirely.
- [ ] Pressing `Ctrl+.` cycles through Architect -> Code -> Ask -> Debug -> Orchestrator (and custom modes except `review`).
- [ ] `review` mode is still selectable from the mode dropdown and from completion suggestions.
