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

* **Single Source of Truth (SSOT):** All your coding rules, architecture standards, and skills are stored in one place. No more manual copy-pasting of configs between repositories—update in one place, sync everywhere in seconds.
* **Smart Hybrid Structure:** Clear separation between **global context** (your personal workflow, Git-flow, coding standards) and **project context** (unique stack, folder structure, and specific task business logic).
* **Cross-Agent Ecosystem:** Generates configurations tailored to the specifics, syntax, and limitations of each specific AI assistant (from tabular priorities for Claude Code to isolated rules for Cursor).
* **Safe Integration (No Overwrites):** The CLI treats your files with care. Custom skills added manually, through IDE UIs, or by third-party software (e.g., Figma plugins or Angular CLI) are not overwritten, but carefully isolated or appended.
* **Local and Remote Execution:** Total infrastructure flexibility. The CLI supports working with both a local context folder on your machine and a remote central repository (e.g., your team's private rules base on GitHub).
* **Smart Project Specifics Merge:** The script automatically matches global skills with the local project folder on the server. If there is a custom deployment or generation skill for the current project, the CLI will drop it into the shared client folder, forming a seamless working environment.
* **Smart Settings Auto-save (Zero Re-configuration):** Upon the first run, the interactive builder will create a configuration file for the current project. You won't have to re-check the checkboxes every time you update—the CLI will remember your choices and instantly update all rules and skills to the latest versions in one click on subsequent runs.

<div id="-quick-start"></div>

## 📦 Quick Start

### 1. Preparing the Central Base (Template)

1. **Fork** this repository to your account (via the GitHub interface or using the GitHub CLI):
```bash
gh repo fork your-username/agent-context-sync-cli --clone=true
```
2. If you forked via the browser, clone your repository locally:
```bash
git clone https://github.com/your-username/agent-context-sync-cli.git
```

```bash
cd agent-context-sync-cli
```
3. Populate the `context/` folder with your global rules and skills (in `context/rules/` and `context/skills/`), adhering to the project architecture. Describe project specifics in `context/projects/`. Commit and push the changes to your repository.

---

### 2. CLI Execution Scenarios

You can use the utility locally (for developing and testing your rules) or remotely (ideal for team collaboration).

#### Option A: Local Execution (Development and Testing)

1. Build the project from source within the utility folder:
```bash
npm run build
```
2. Navigate to the root of your working project (where you want to install the rules) and run the script, specifying the path to the built `index.js`:
```bash
cd ../path-to-your-target-project
```
```bash
node ../agent-context-sync-cli/dist/index.js
```

#### Option B: Remote Execution (For Teams and Daily Use)

The tool supports remote execution directly from GitHub. This eliminates the need to clone the CLI itself to every workstation. A Team Lead or Architect can update rules in one central repository, and developers simply run the command in their projects:

```bash
npx github:your-username/agent-context-sync-cli
```

> 🔒 **Important:** If your rules repository is private, all team members must have SSH access configured for GitHub, or use a Personal Access Token (PAT). On the first run, the interactive configurator will create a local settings file, and for subsequent updates, you just need to run the same command without re-selecting options.

<div id="-output-project-structure"></div>

## 📁 Output Project Structure

An example of the file structure that will be generated in the root of your project after a successful synchronization. The final set of files depends on the rules and skills you select in the interactive builder.

```text
your-project/
├── .agents/                          # Isolated context storage
│   ├── rules/                        # Declarative context (Rules)
│   │   ├── userprompt.md             # System prompt and base agent role
│   │   ├── workflow.md               # Developer and AI interaction workflow
│   │   ├── spec.md                   # Technical specification of the current project
│   │   ├── architecture.md           # Architectural patterns and code guidelines
│   │   ├── angular.md                # Specific rules for the chosen framework
│   │   └── package-rules.md          # Rules for working with packages and tools
│   └── skills/                       # Imperative context (Skills / Tools)
│       ├── angular-dev/              # Complex skill as a separate folder
│       │   └── SKILL.md
│       └── code-reviewer.md          # Atomic skill as a single file
├── CLAUDE.md                         # Configuration manifest for Claude Code
├── GEMINI.md                         # Context settings for Gemini CLI
├── AGENTS.md                         # Universal manifest for Codex / other agents
├── .cursor/                          # Integration with Cursor IDE
│   └── rules/                        # Auto-detected rules (.mdc)
├── .continue/                        # Integration with the Continue.dev plugin
│   └── rules/                        # Local rules for Continue
└── ai-rules-config.json              # CLI configuration file (for updates)
```

<div id="-context-architecture"></div>

## 🏗 Project Rules and Skills Architecture

> ⚠️ **Important:** The developer must strictly adhere to the naming, patterns, and folder structures described below. Violating the structure will prevent the CLI from correctly scanning and assembling the context files.

```text
/context/
├── rules/                           # Global rule templates
│   ├── frontend/
│   │   ├── userprompts/             # System prompts / Roles
│   │   ├── packages/                # Rules for packages and utilities
│   │   ├── workflows/               # Interaction rules (Definition of Done)
│   │   ├── architectures/           # Architectural patterns
│   │   └── frameworks/              # Framework guidelines
│   ├── backend/
│   │   └── ...
│   └── fullstack/
│       └── ...
├── skills/                          # Reusable global skills
│   ├── angular-dev/                 # Complex skill (Folder-based)
│   │   └── SKILL.md
│   └── code-reviewer.md             # Simple skill (File-based)
└── projects/                        # Specifics of particular projects (Project context)
    └── <example-project>/           # Folder matching the specific repository name
        ├── rules/                   # Project rules and overrides
        │   ├── spec.md              # Technical specification of the project (Unique)
        │   ├── userprompt.md        # Custom role for this project
        │   ├── workflow.md          # Special workflow (if different from global)
        │   ├── package-rules.md     # Specific package rules for the project
        │   ├── architecture.md      # Local architecture features
        │   └── framework.md         # Features of framework usage here
        └── skills/                  # Isolated skills just for this project
            ├── local-deploy.md      # Custom deployment script for the specific repo
            └── db-seeder/           # Local complex skill (Folder-based)
                └── SKILL.md
```

---

<div id="rules-section"></div>

### 📁 Rules Collection Structure

Considering that system prompts and code requirements differ radically for various development directions, templates are distributed across three base directories: `frontend`, `backend`, or `fullstack`.

The developer forms rule sets within these folders based on the specifics of the projects their team is working on.

```text
/context/
└── rules/
	├── frontend/
	├── backend/
	└── fullstack/
```

#### 1 Global Rules

This is a centralized collection of all possible rules that can be used in the company's or an individual developer's ecosystem. It is from this pool of files that the interactive CLI configures a single, custom set of rules for a specific target project.

Below is the substructure for each stack (using `/context/<stack>/` as an example):

##### 🔹 Role and System Prompt — `userprompts/`
Sets the base role of the AI agent, defining it as an expert in a specific narrow niche, endowed with the necessary soft and hard skills.
* **Repository path:** `/context/<stack>/userprompts/<userprompt>.md`
* **Build result:** Compiles into the `.agents/rules/userprompt.md` file on the client.
* **Constraint:** The folder can contain any number of templates for different tasks, but each file must have a unique name.

##### 🔹 Tools and Dependencies — `packages/`
Describes the rules for using specific libraries, utilities, or packages in the project. It records code style requirements for tools, constraints (what is allowed and what is strictly forbidden), and architectural nuances of their integration.
* **Repository path:** `/context/<stack>/packages/<package>.md`
* **Build result:** Compiles into a single shared file `.agents/rules/package-rules.md`.
* **🔥 Multi-selection feature (Merge):** The folder contains multiple atomic files (e.g., `typescript.md`, `rxjs.md`, `tailwind.md`). Upon running, the CLI displays them as an interactive list with checkboxes. All tools selected by the user are automatically merged into a single `package-rules.md` file for the current project.

*Example of an atomic rule file content (`packages/typescript.md`):*
```markdown
## Strict Typing (TypeScript)

- **NO `any`**: The use of the `any` type is strictly forbidden. You must define proper interfaces, types, or generics for all data structures.
- The project tooling (Linter/Prettier) is configured for strict typing. Code that is loosely typed will fail the automated checks.
```

##### 🔹 Workflow — `workflows/`
Regulates the rules of direct interaction between the developer and the AI agent. Describes requirements for task execution stages, Definition of Done, commit formatting rules, and dialog logic.
* **Repository path:** `/context/<stack>/workflows/<workflow>.md`
* **Build result:** Compiles into the `.agents/rules/workflow.md` file on the client.
* **Constraint:** Each workflow template file in the folder must have a unique name.

##### 🔹 Architectural Patterns — `architectures/`
Instructions for the AI agent to follow the project's architectural design. Describes global patterns (SOLID, Clean Architecture, FSD), folder structure generation rules, and naming conventions.
* **Repository path:** `/context/<stack>/architectures/<architecture>.md`
* **Build result:** Compiles into the `.agents/rules/architecture.md` file on the client.
* **Constraint:** Each file in the folder must have a unique name.

##### 🔹 Frameworks — `frameworks/`
Specific in-depth recommendations for working with the main project framework (Angular, NestJS, React, etc.). If the project is written in pure language without frameworks, a set of rules for building the application with native tools (e.g., Node.js API) is created here.
* **Repository path:** `/context/<stack>/frameworks/<framework>.md`
* **Build result:** Compiles into the `.agents/rules/<framework>.md` file on the client.
* **Constraint:** Each file in the folder must have a unique name.


#### Project Rules
A developer can create specific skills for a particular project. If the developer follows the file naming conventions for project rules, the console prompt will offer the choice between using the project file or selecting from the general rules.

```text
/context/
└── projects/                        # Specifics of particular projects (Project context)
    └── <example-project>/           # Folder matching the specific repository name
        ├── rules/                   # Project rules and overrides
        │   ├── spec.md              # Technical specification of the project (Unique)
        │   ├── userprompt.md        # Custom role for this project
        │   ├── workflow.md          # Special workflow (if different from global)
        │   ├── package-rules.md     # Specific package rules for the project
        │   ├── architecture.md      # Local architecture features
        │   └── framework.md         # Features of framework usage here
   ```


##### 🔹 Project Technical Specification — `spec.md`

Inside the project folder, the developer can create a `spec.md` file detailing the project's technical characteristics and the architectural pattern to follow when creating new files, so the agent understands exactly where to place them.

Example content:

```markdown
# Project Overview

## Tech Stack

- **Framework**: Angular (v22+) using the application builder.
- **State**: Signals for component state; RxJS for asynchronous operations (HTTP requests).
- **Testing**: Vitest for unit testing.
- **Internationalization (i18n)**: `ngx-translate` for multi-language support.
- **Security**: FingerprintJS for device identification.


## Project architecture

### `core/`

Global singleton services and infrastructure logic.

- **`directives/`**: Core directives (e.g., loader handling).
- **`initializers/`**: App initialization (Config, I18n).
…

### `entities/`

Domain-specific components and "smart" UI elements (e.g., Header, SideNav, UserWidget).

### `pages/`

Route-level components (Screens) and page-specific logic:

- **`private/`**: Authenticated area (Dashboard, Strategies, Activity, Billing, Credentials).
- **`public/`**: Publicly accessible pages, including Auth logic (Sign In/Up), Privacy, Terms, and Page Not Found.

### `shared/`

Reusable, "dumb" UI elements and common utilities.

- **`ui/`**: Pure UI Kit components (Buttons, Inputs, Callouts, Avatar, Badge, Strategy Card, Theme Toggle, Top Bar, etc.).
- **`theme/`**: Design system tokens and CSS variables.
```

<div id="skills-section"></div>

### 📁 Skills Collection Structure

#### Global Skills Collection

A list of applied instructions (skills) that a developer can select for a specific project via an interactive menu.

> ⚠️ **IMPORTANT!** Every `.md` skill file must have a Front Matter header with a specific syntax. A mandatory requirement is the presence of two parameters wrapped in triple dashes `---`:
* `name: ...` — the technical name of the skill that will be displayed in the builder's checkboxes.
* `description: ...` — a brief description of the skill's purpose, which the CLI will automatically write into the main agent manifest on the client.

Example of a valid skill header:
```markdown
---
name: ai-context-manager
description: Manage, synchronize, and update the AI agent rules and skills using the centralized CLI tool.
license: MIT
---

... here goes the text of the skill itself with instructions for the agent ...
```

##### Skill Architecture Variants
Skills can be of two types depending on their complexity:
1. **Simple (File-based)** — consist of a single `.md` file. Suitable for concise, atomic tasks.
2. **Complex (Folder-based)** — consist of a separate folder, inside which there can be an unlimited number of auxiliary files, sub-skills, or code examples. In the root of such a folder, there **must** be a `SKILL.md` file containing the logic description and links to the environment files.

Example of a global structure:
```text
/context/
└── skills/                          # Global reusable skills
    ├── code-reviewer.md             # Simple skill (one file)
    └── angular-dev/                 # Complex skill (folder)
        └── SKILL.md                 # Mandatory complex skill manifest
```

---

#### Project Skills Collection

You can create a unique set of skills for a specific repository, which will differ from the global ones and apply only within the current project. Found skills will be added to the project.

> ⚠️ **Important!** The project folder inside the `projects/` directory must be named strictly identical to the target project repository for which the skills are generated.

Example of project context structure:
```text
/context/
└── projects/                        # Specifics of particular projects
    └── <example-project>/           # Folder matching the specific repository name
        └── skills/                  # Isolated skills just for this project
            ├── local-deploy.md      # Custom deployment script for the specific repo
            └── db-seeder/           # Local complex skill (Folder-based)
                └── SKILL.md         # Local complex skill manifest
```

<div id="-faq"></div>

## ❓ FAQ (Frequently Asked Questions)

**What happens if I add new skills manually or via a third-party IDE plugin?**
The script uses isolated Safe Zones technology via special `<!-- BEGIN/END AGENT-RULES-SYNC -->` comments. The utility only updates its manifest table. Any custom rules you added manually in `CLAUDE.md`, `.cursorrules`, or generated by other plugins will not be overwritten.

**What should I do if my project already has a main AI agent configuration file?**
If `agent-context-sync-cli` detects an existing manifest during the first synchronization, it won't blindly overwrite it. The CLI will display an interactive prompt offering to either safely integrate the new rules (append to the file) or perform a full overwrite.

**Which AI agents and IDEs are supported out of the box?**
The tool is universal and generates native specifications for most modern AI tools: Claude Code (`CLAUDE.md`), Cursor IDE (`.cursor/rules/`), Continue.dev (`.continue/rules/`), Gemini CLI (`GEMINI.md`), as well as a universal `AGENTS.md` manifest (for GitHub Copilot, Codex, and other LLM integrations).

**How do I update the project context if the team's global rules on the server have changed?**
You do not need to go through the interactive poll again. Upon the first run, the utility creates a local `ai-rules-config.json` file with your preferences (Zero Re-configuration). Just run the sync command again, and the script will automatically download the latest versions of your previously selected skills and rules.

**Does the tool support working with monorepos (Monorepo, Nx, Turborepo)?**
Yes. You can run the CLI isolated in the root of each individual package, application, or microservice within your monorepo. A separate `ai-rules-config.json` and a unique set of rules will be created for each module (e.g., Angular frontend rules and NestJS backend rules will not mix).

**Will the generated context exceed the token limits (Context Window) of the LLM model?**
No. The essence of the `agent-context-sync-cli` architecture is precisely context optimization. Thanks to the strict separation into global rules and atomic skills, you only inject instructions into the project that are genuinely required. This prevents prompt "bloat", saves tokens, and minimizes AI model hallucinations.

**Can I automate the utility execution in CI/CD or Git Hooks?**
Yes. The utility works perfectly in non-interactive mode if the `ai-rules-config.json` file is already present in the project. You can add the script execution command to `post-merge` or `pre-commit` hooks (e.g., via Husky) so that the entire team always has fresh coding rules after a `git pull`.
