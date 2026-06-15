<h1 align="center">AI Agent Context Sync CLI</h1>
<p align="center">
  <img src="https://github.com/user-attachments/assets/bb442028-f137-4e8f-b905-f795a6177788" alt="AI Agent Context Sync CLI" width="100%">
</p>
<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D18.0-brightgreen?style=flat-square&logo=nodedotjs" alt="Node Version"></a>
  <img src="https://img.shields.io/badge/Ecosystem-Cursor%20%7C%20Claude%20%7C%20Gemini-blue?style=flat-square" alt="Supported Agents">
  <a href="https://github.com/weberstone/agent-context-sync-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://github.com/weberstone/agent-context-sync-cli/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center"><b>
Centralized, modular CLI tool to sync AI coding agents rules & skills across repositories.</b>
</p> 

<p align="center">
An interactive CLI to generate and synchronize global or project-specific development guidelines, architecture standards, and custom agent skills for <b>Cursor</b>, <b>Claude Code</b>, <b>Windsurf</b>, <b>GitHub Copilot</b>, <b>Continue</b>, <b>Codex</b>, and <b>Gemini</b>.
</p>

## 📑 Table of Contents

* [Key Benefits](#key-benefits)
* [📦 Quick Start](#-quick-start)
* [📁 Output Project Structure](#-output-project-structure)
* [🏗 Context Architecture](#-context-architecture)
    * [➡️ Go to Rules Collection](#rules-section)
    * [➡️ Go to Skills Collection](#skills-section)
* [❓ FAQ (Frequently Asked Questions)](#-faq)

---

<div id="key-benefits"></div>

## Key Benefits

* **Single Source of Truth (SSOT):** All your coding rules, architectural standards, and skills are stored in one place. No more manual copy-pasting of configurations across repositories—update in one place, sync everywhere in seconds.
* **Smart Hybrid Structure:** Clear separation into **global context** (your personal workflow, Git-flow, code standards) and **project context** (unique stack, folder structure, and business logic of a specific task).
* **Cross-Agent Ecosystem:** Generation of configurations tailored to the specifics, syntax, and limitations of each specific AI assistant (from tabular priorities for Claude Code to isolated rules for Cursor).
* **Safe Integration (No Overwrite):** The CLI treats your files with care. Custom skills added manually, via IDE UI, or third-party software are not overwritten, but carefully isolated or appended.
* **Local & Remote Execution:** Full infrastructure flexibility. The CLI supports working with both a local context folder on your machine and a remote central repository.
* **Smart Project Specifics Merge:** The script automatically matches global skills with the local project folder on the server.
* **Smart Auto-Save Settings (Zero Re-configuration):** On the first run, the interactive builder will create a configuration file for the current project. You won't have to re-check the boxes upon every update.

---

## 📦 Quick Start

### 1. Prepare the Central Base (Template)

1. **Fork** this repository to your account:
```bash
gh repo fork your-username/agent-context-sync-cli --clone=true
```
2. Fill the `context/` folder with your global rules and skills. Commit and push the changes to your repository.

### 2. CLI Execution Scenarios

#### Variant A: Local Execution (Development & Tests)

1. Build the project from source:
```bash
npm run build
```
2. Go to the root of your working project and run the script:
```bash
cd ../path-to-your-target-project
node ../agent-context-sync-cli/dist/index.js
```

#### Variant B: Remote Execution (For Teams & Daily Use)

Run directly from GitHub. The team lead updates the rules in the central repository, and developers simply run the command in their projects:

```bash
npx github:your-username/agent-context-sync-cli
```

> 🔒 **Important:** If your rules repository is private, you must have SSH access to GitHub configured or a Personal Access Token (PAT).

---

## 📁 Output Project Structure

Example file structure that will be generated in the root of your project after synchronization:

```text
your-project/
├── .agents/                          # Isolated context storage
│   ├── rules/                        # Declarative context (Rules)
│   │   ├── userprompt.md             
│   │   ├── workflow.md               
│   │   ├── spec.md                   
│   │   ├── architecture.md           
│   │   ├── angular.md                
│   │   └── package-rules.md          
│   └── skills/                       # Imperative context (Skills / Tools)
│       ├── angular-dev/              
│       │   └── SKILL.md
│       └── code-reviewer.md          
├── CLAUDE.md                         # Configuration manifest for Claude Code
├── GEMINI.md                         # Context settings for Gemini CLI
├── AGENTS.md                         # Universal manifest for Codex / other agents
├── .cursor/                          # IDE Cursor integration
│   └── rules/                        
├── .continue/                        # Continue.dev plugin integration
│   └── rules/                        
└── ai-context-config.json              # CLI configuration file (for updates)
```

---

<div id="-context-architecture"></div>

## 🏗 Context Architecture

> ⚠️ **Important:** The developer must strictly follow the naming, patterns, and folder structure described below. Breaking the structure will prevent the CLI from correctly scanning and building the context files.

<div id="rules-section"></div>

### 📁 Rules Collection Structure (Rules)

Templates are distributed across base directories: `frontend`, `backend`, or `fullstack`. The developer creates rule sets within these folders.

#### 1. Global Rules

* **`userprompts/` (Role and System Prompt):** Sets the base role of the AI agent. Compiles to `.agents/rules/userprompt.md`.
* **`packages/` (Tools and Dependencies):** Rules for using specific libraries. All selected files are automatically merged into a single `package-rules.md`.
* **`workflows/` (Workflow):** Regulates the rules of direct interaction between the developer and the AI agent (DoD, commits).
* **`architectures/` (Architectural Patterns):** Instructions on adhering to the project's architectural design (SOLID, FSD).
* **`frameworks/` (Frameworks):** Specific recommendations for working with the project's main framework.

#### 2. Project Rules

Inside the project folder (`context/projects/<example-project>/`), the developer can create unique rules. For example, a `spec.md` file detailing the technical characteristics and architectural pattern of a specific repository.

<div id="skills-section"></div>

### 📁 Skills Collection Structure (Skills)

A list of applied instructions that the developer selects via an interactive menu.

> ⚠️ **IMPORTANT!** Each `.md` skill file must have a Front Matter header with a name and description:
```markdown
---
name: ai-context-manager
description: Manage, synchronize, and update the AI agent rules and skills.
license: MIT
---
```

**Skill Architecture Variants:**
1. **Simple (File-based)** — consists of a single `.md` file. Suitable for concise atomic tasks.
2. **Complex (Folder-based)** — a separate folder with an unlimited number of auxiliary files. A `SKILL.md` file is strictly required in the root.

---

<div id="-faq"></div>

## ❓ FAQ (Frequently Asked Questions)

**What happens if I add new skills manually or via a third-party IDE plugin?**
The script uses safe zone technology via special comments `<!-- BEGIN/END AGENT-RULES-SYNC -->`. The utility only updates its own manifest table. Custom rules are not overwritten.

**What if my project already has a main AI agent configuration file?**
The CLI won't blindly overwrite it. An interactive prompt will appear offering to safely integrate the new rules or do a full overwrite.

**Which AI agents are supported out of the box?**
Claude Code, Cursor IDE, Continue.dev, Gemini CLI, and a universal `AGENTS.md` for other LLMs.

**How do I update the project context if the server rules change?**
Just run the sync command again. The script uses the local `ai-context-config.json` and will automatically download the latest versions of the previously selected files without re-prompting.

**Does the tool support working with monorepos (Monorepo, Nx, Turborepo)?**
Yes. You can run the CLI isolated in the root of each individual package, application, or microservice.

**Will the generated context exceed the LLM's token limits (Context Window)?**
No. By separating global rules and atomic skills, you only inject the instructions that are actually required. This prevents prompt bloating and saves tokens.

**Can I automate the utility's execution in CI/CD or Git Hooks?**
Yes. The utility works in non-interactive mode if the `ai-context-config.json` file is present. Add the command to `post-merge` or `pre-commit` hooks.