# TTS (Text-to-Speech) Issues to Fix

## Issue 1: Slider in Notification Settings Should Go to 350%

- **Location**: Settings > Notifications panel
- **Problem**: The playback speed slider only goes up to 200%
- **Expected**: Slider should allow setting speed up to 350%
- **Status**: Needs implementation

## Issue 2: Voice Dropdown Missing in Notification Settings

- **Location**: Settings > Notifications panel
- **Problem**: Voice selection dropdown only appears in chat view toggle, not in Notification Settings
- **Expected**: Voice dropdown (male/female options) should be available in Notification Settings panel
- **Status**: Needs implementation

## Issue 3: Speaker Icon Should Mute/Stop TTS

- **Location**: Header bar speaker icon toggle
- **Problem**: Pressing the speaker icon doesn't stop or mute the currently playing TTS
- **Expected**:
    - First click: Mute/stop the current TTS playback
    - Visual feedback: Icon should reflect muted state
- **Status**: Needs implementation

## Issue 4: New Prompt Should Stop Previous TTS

- **Problem**: When user sends a new prompt while TTS is reading previous response, the old TTS continues playing
- **Expected**:
    - When user sends a new prompt, any currently playing TTS should stop immediately
    - Only the new response should be read (if TTS is enabled)
- **Status**: Needs implementation

---

## Technical Notes

### Current State

- TTS uses the `say` package on macOS for speech synthesis
- Settings stored in ExtensionState
- TtsToggle component handles the speaker icon in header

### Files Likely Involved

- `kilocode-legacy/src/utils/tts.ts` - TTS utility functions
- `kilocode-legacy/webview-ui/src/components/settings/NotificationSettings.tsx` - Notification settings panel
- `kilocode-legacy/webview-ui/src/components/TtsToggle.tsx` - Speaker icon toggle
- `kilocode-legacy/src/core/webview/ClineProvider.ts` - State management
- `kilocode-legacy/src/core/webview/webviewMessageHandler.ts` - Message handling
