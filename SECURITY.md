# Security Policy

## Design Principles

Tuesday is designed with security boundaries as a core principle:

### 1. Local-Only by Default
- All speech processing happens on your machine (faster-whisper, pyttsx3)
- No audio is sent to any cloud service unless you explicitly configure one
- No telemetry, no analytics, no phone-home

### 2. Bounded Command Execution
- The command router only runs registered handlers
- Built-in commands have limited scope (time, notes, help)
- The "Run tests" command only executes `pytest` within the repo directory

### 3. Autonomous Mode Safeguards
- **Time-bounded**: configurable max duration (default 30 minutes)
- **Command allowlist**: only pre-approved commands can run
- **Directory-locked**: only operates within the project directory
- **No network access**: autonomous tasks cannot make network calls
- **Full audit trail**: every task is logged to `reports/`

### 4. Voice Programming Boundaries
- User-created commands can only return text responses
- Generated handler files are simple response functions
- No arbitrary code execution from voice input
- All commands are saved to YAML for review

### 5. File System Access
- Tuesday only reads/writes within its own directory tree:
  - `notes/` — user notes
  - `reports/` — generated reports
  - `user_commands/` — command definitions
  - `app/commands/user_generated/` — generated handlers
- No access to system files, home directory, or other applications

## Reporting Vulnerabilities

If you find a security issue, please open a GitHub issue or contact the maintainer directly.

## What Tuesday Does NOT Do
- Access browser data, cookies, or passwords
- Read SSH keys or credentials
- Make network requests (unless you add a provider that does)
- Execute arbitrary shell commands from voice input
- Modify system settings
- Access other applications' data
