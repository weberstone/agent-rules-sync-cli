# Architecture

## Overview

`agent-rules-sync-cli` — CLI-инструмент на Node.js/TypeScript. Запускается в корне целевого проекта, проводит интерактивный опрос о технологическом стеке и генерирует файлы правил для AI-агентов.

### Режимы запуска

| Режим | Команда | Откуда читаются шаблоны |
|---|---|---|
| Локальный | `node path/to/agent-rules-sync-cli/dist/index.js` | Локальная копия репозитория |
| Удалённый | `npx github:user/agent-rules-sync-cli` | npm-кэш (npm скачивает пакет временно) |

Шаблоны (`rules/`) включаются в npm-пакет через `"files": ["dist/", "rules/"]`. В обоих режимах скрипт читает шаблоны относительно `import.meta.url`. При удалённом запуске **не происходит** git clone в проект пользователя — npm скачивает пакет в свой кэш, скрипт выполняется, результат пишется в `process.cwd()`.

Для приватных репозиториев пользователю нужны SSH-ключи, настроенные с GitHub. Специальной логики в скрипте не требуется — аутентификация на стороне npm/git.

### Принципиальная схема

```
┌──────────────────────────────────────┐
│  agent-rules-sync-cli (пакет)        │
│  ┌────────────┐  ┌────────────────┐  │
│  │  rules/    │  │  dist/index.js │  │
│  │  (шаблоны) │  │  (CLI-код)     │  │
│  └────────────┘  └────────────────┘  │
└──────────────────┬───────────────────┘
                   │ node / npx
                   ▼
┌──────────────────────────────────────┐
│  Целевой проект ($CWD)               │
│  ┌──────────────────────────────────┐│
│  │ .agents/rules/                   ││
│  │  ├── spec.md                     ││
│  │  ├── architecture.md             ││
│  │  ├── workflow.md                 ││
│  │  ├── <framework>.md              ││
│  │  └── package-rules.md (опц.)     ││
│  ├── CLAUDE.md                      ││
│  ├── AGENTS.md                      ││
│  ├── .cursorrules                   ││
│  └── ai-rules-config.json           ││
└──────────────────────────────────────┘
```

---

## Core Principles

1. **Zero-config для первого запуска.** Конфиг не найден → опросник.
2. **Config-driven для повторных.** Конфиг позволяет пропустить опросник.
3. **Source of Truth на стороне CLI.** Шаблоны живут в пакете `agent-rules-sync-cli`. Целевой проект получает только скомпилированный результат.
4. **Project overrides.** Пользователь может создать `rules/projects/<name>/` в своём форке с персональными версиями `spec.md`, `architecture.md`, `workflow.md`. Они имеют приоритет над общими шаблонами.
5. **Минимум зависимостей.** `@clack/prompts` + `picocolors`. Остальное — нативные модули Node.js.
6. **Single-file bundle.** `tsup` компилирует `src/` в `dist/index.js`.

---

## Directory Structure

```
agent-rules-sync-cli/
├── src/
│   ├── index.ts                  # Точка входа, оркестратор
│   ├── config.ts                 # Чтение/запись ai-rules-config.json
│   ├── discovery.ts              # Сканирование rules/
│   ├── prompts.ts                # Опросник (@clack/prompts)
│   ├── compiler.ts               # Компиляция выбранных правил
│   ├── generators/
│   │   ├── claude.ts             # CLAUDE.md / AGENTS.md
│   │   ├── cursor.ts             # .cursorrules
│   │   └── ...                   # Gemini, Codex, Continue
│   ├── output.ts                 # Запись файлов в целевой проект
│   └── utils.ts                  # Пути, fs, логирование
├── rules/                        # Шаблоны (включаются в npm-пакет)
│   ├── frontend/
│   │   ├── architecture.md
│   │   ├── workflow.md
│   │   ├── frameworks/
│   │   │   └── *.md
│   │   └── packages/
│   │       └── *.md
│   ├── backend/
│   │   └── ... (аналогично frontend)
│   ├── fullstack/
│   │   └── ... (аналогично frontend)
│   └── projects/                 # Проектные переопределения
│       └── <project-name>/
│           ├── spec.md
│           ├── architecture.md   # Опционально
│           └── workflow.md       # Опционально
├── dist/                         # Скомпилированный бандл (не в git)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── docs/
```

---

## Data Flow

```
Пользователь запускает npx/node
         │
         ▼
  ┌──────────────┐    ┌─────────────────┐
  │ 1. Config?   │─да─▶ Use existing    │
  └──────┬───────┘    │ config?         │
         │ нет        ├── Yes → skip    │
         ▼            │   questionnaire │
  ┌──────────────┐    └──┬──────┬───────┘
  │ 2. Spec check│       │      │ No → questionnaire
  └──────┬───────┘       │      ▼
         ▼               │  ┌───────────────┐
  ┌──────────────┐       │  │ 3. Arch type  │──▶ Frontend
  │ Questionnaire│       │  └───────────────┘    / Backend
  │ (steps 3-7)  │       │         │             / Fullstack
  └──────┬───────┘       │         ▼
         │               │  ┌───────────────┐
         ▼               │  │ 4. Framework  │──▶ radio
  ┌──────────────┐       │  └───────────────┘
  │ 8. Compile   │◀──────┘         │
  │    rules     │                 ▼
  └──────┬───────┘        ┌───────────────┐
         │                │ 5. Packages   │──▶ multiselect
         ▼                └───────────────┘
  ┌──────────────┐                 │
  │ 9. Generate  │                 ▼
  │    agent     │        ┌───────────────┐
  │    files     │        │ 6. Workflow   │──▶ project override
  └──────┬───────┘        └───────────────┘    or default
         │                         │
         ▼                         ▼
  ┌──────────────┐        ┌───────────────┐
  │10. Write     │        │ 7. Agents     │──▶ multiselect
  │    config    │        └───────────────┘
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │11. Done +    │
  │   ASCII art  │
  └──────────────┘
```

---

## Key Design Decisions

### 1. Разделение source и target путей

```
Source (шаблоны):  path.dirname(fileURLToPath(import.meta.url)) + '/rules/'
Target (вывод):    process.cwd()
```

Критично: при `npx` пакет скачивается в кэш npm, и шаблоны читаются оттуда. Вывод — всегда `process.cwd()`.

### 2. Определение имени проекта

```ts
const projectName = path.basename(process.cwd());
```

### 3. Приоритет правил (от высшего к низшему)

Для `spec.md`, `architecture.md`, `workflow.md`:
1. `rules/projects/<projectName>/<file>.md` (если существует и не пуст)
2. `rules/<arch>/<file>.md` (общий шаблон)
3. Пропуск с предупреждением

### 4. Конфигурационный файл

Формат: JSON. Имя: `ai-rules-config.json`. Расположение: `process.cwd()`.

```json
{
  "version": 1,
  "projectName": "my-app",
  "architecture": "frontend",
  "framework": "angular-guidelines",
  "packages": ["tailwind", "typescript"],
  "agents": ["claude-code", "cursor"],
  "lastSync": "2026-06-14T12:00:00Z"
}
```

Плоская структура, все поля обязательны кроме `packages` (может быть пустым массивом).

### 5. Компиляция package-rules.md

Конкатенация выбранных файлов с общим заголовком:

```md
# Code Style & Tools

<содержимое первого выбранного файла>

<содержимое второго выбранного файла>
```

Если пользователь не выбрал ни одного пакета — файл не создаётся, и ссылка на него в агентских файлах отсутствует.

### 6. Bundling стратегия

`tsup` компилирует `src/` в `dist/index.js`. `rules/` **не бандлятся** — они читаются во время выполнения. `package.json` включает и то, и другое: `"files": ["dist/", "rules/"]`.

### 7. Именование выходных файлов

| Выходной файл | Источник |
|---|---|
| `spec.md` | `rules/projects/<name>/spec.md` (если есть), иначе пропуск |
| `architecture.md` | Проектный или `rules/<arch>/architecture.md` |
| `workflow.md` | Проектный или `rules/<arch>/workflow.md` |
| `<framework>.md` | Выбранный файл из `rules/<arch>/frameworks/`, имя сохраняется |
| `package-rules.md` | Компиляция из выбранных `rules/<arch>/packages/*.md` |

### 8. Fullstack-архитектура

При выборе Fullstack скрипт работает с `rules/fullstack/`. Структура директории идентична frontend/backend. Никакой специальной логики слияния frontend+backend не требуется — fullstack-правила пишутся пользователем самостоятельно как отдельный набор.

---

## Module Responsibilities

| Модуль | Ответственность |
|---|---|
| `index.ts` | Оркестрация flow. Точка входа. |
| `config.ts` | Чтение, запись, валидация `ai-rules-config.json`. |
| `discovery.ts` | Сканирование `rules/` — список frameworks, packages, проверка project overrides. |
| `prompts.ts` | Интерактивные вопросы через `@clack/prompts`. Без бизнес-логики. |
| `compiler.ts` | Сборка выходных `.md` файлов: копирование + компиляция package-rules.md. |
| `generators/*.ts` | Генерация агент-специфичных файлов (CLAUDE.md, .cursorrules, etc.). |
| `output.ts` | Запись файлов в `process.cwd()`, логика overwrite/append/skip. |
| `utils.ts` | Path resolution, цветное логирование, fs-хелперы. |

---

## Error Handling Strategy

1. **Pre-flight:** Проверить доступность `rules/` перед началом.
2. **Graceful degradation:** Файл шаблона не найден/пуст → предупредить, спросить продолжать ли.
3. **Нет прав на запись:** Понятная ошибка, выход.
4. **Прерванный опросник (Ctrl+C):** Чистый выход, ничего не создано.
5. **Ошибка на этапе генерации:** Сообщить пользователю. Частично созданная `.agents/` возможна, но пользователь предупреждён.