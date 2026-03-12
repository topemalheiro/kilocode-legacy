# Kilo Code - Working Guidelines

## ⚠️ IMPORTANT: Always Use Main Branch

**When working on Kilo Code, ALWAYS work on the `main` branch, NOT feature branches.**

### Why
- Feature branches may contain incomplete or unstable work
- All completed features should be merged into `main` 
- Working on main ensures you have the latest stable code

### How to Stay on Main

```bash
# Always start by checking you're on main
git checkout main
git pull origin main

# Never create or switch to feature branches unless explicitly required
```

### Current Status (2026-03-11)

**Merged into main:**
- ✅ YOLO mode - auto-approves everything + disables follow-up questions
- ✅ alwaysAllowAllCommands - bypasses allowedCommands list, only checks deniedCommands  
- ✅ Thinking blocks sync - follow-the-leader behavior
- ✅ MiniMax image support
- ✅ Sidebar width fix
- ✅ Slash commands and skills loading fixes

### Build Command
```bash
cd kilocode-legacy
npm run build
# Output: bin/kilo-code-5.10.1.vsix
```
