# Roadmap

Этапы спроектированы так, чтобы каждый давал завершённый, проверяемый результат. Зависимости минимальны — этап зависит только от предыдущего (реже от двух).

---

## Этап 1: Инициализация проекта

**Цель:** Скелет проекта, способный скомпилироваться в `dist/index.js`.

**Задачи:**
- [x] `package.json` — name, version, `"type": "module"`, dependencies (`@clack/prompts`, `picocolors`), devDependencies (`tsup`, `typescript`, `@types/node`), `"files": ["dist/", "context/"]`
- [x] `tsconfig.json` — target ES2022, module ESNext, strict, moduleResolution bundler
- [x] `tsup.config.ts` — entry `src/index.ts`, format esm, minify, clean, no external
- [x] `src/index.ts` — минимальный `console.log('agent-rules-sync-cli ready')`
- [x] `.gitignore` — `dist/`, `node_modules/`

**Зависимости:** Нет.

**Definition of Done:**
- `npm install` без ошибок
- `npm run build` создаёт `dist/index.js`
- `node dist/index.js` печатает сообщение

---

## Этап 2: Утилиты и разрешение путей

**Цель:** Модуль `utils.ts` — фундамент для всей работы с путями и файловой системой.

**Задачи:**
- [x] `getSourceDir()` — директория CLI через `import.meta.url` + `fileURLToPath`
- [x] `getTargetDir()` — `process.cwd()`
- [x] `getProjectName()` — `path.basename(process.cwd())`
- [x] `getRulesDir()` — `path.join(getSourceDir(), 'context/rules')`
- [x] Цветное логирование: `logSuccess()`, `logWarning()`, `logError()`, `logInfo()` (через `picocolors`)
- [x] `readTextFile(path)`, `writeTextFile(path, content)` на `fs/promises`
- [x] `ensureDir(path)` — рекурсивное создание директории

**Зависимости:** Этап 1.

**Definition of Done:**
- `getSourceDir()` работает при запуске через `node` и через `npx`
- `getProjectName()` возвращает имя текущ ей директории
- Хелперы чтения/записи работают с абсолютными путями

---

## Этап 3: Конфигурационный файл

**Цель:** Чтение, запись и валидация `ai-rules-config.json`.

**Задачи:**
- [x] TypeScript-тип `Config`:
  ```ts
  interface Config {
    version: number;
    projectName: string;
    architecture: 'frontend' | 'backend' | 'fullstack';
    frameworks: string[];        // always array, 1 for frontend/backend, N for fullstack
    packages: string[];
    agents: string[];
    hasUserprompt: boolean;      // whether userprompt.md was found and included
    lastSync: string;            // ISO 8601
  }
  ```
- [x] `readConfig(targetDir): Config | null` — читает и валидирует JSON
- [x] `writeConfig(targetDir, config): Promise<void>` — форматированный JSON
- [x] `validateConfig(data): Config` — проверка структуры, понятная ошибка при несовпадении
- [x] Повреждённый JSON → warning + предложение пройти опросник заново

**Зависимости:** Этап 2.

**Definition of Done:**
- `readConfig` → `Config` для валидного JSON
- `readConfig` → `null` если файла нет
- `readConfig` → warning при повреждённом файле
- Круговая проверка: `readConfig` читает то, что записал `writeConfig`

---

## Этап 4: Обнаружение шаблонов (Discovery)

**Цель:** Сканирование `context/rules/` и возврат доступных опций для каждого шага опросника.

**Задачи:**
- [x] Переименовать `context/rules/*/package/` → `context/rules/*/packages/` (привести к каноническому имени)
- [x] `listFrameworks(arch): Promise<string[]>` — сканирует `context/rules/<arch>/frameworks/`, имена файлов без `.md`
- [x] `listPackages(arch): Promise<string[]>` — сканирует `context/rules/<arch>/packages/`
- [x] `hasProjectOverride(projectName, fileName): Promise<boolean>` — непустой файл в `context/projects/<projectName>/rules/`
- [x] `getProjectOverride(projectName, fileName): Promise<string | null>` — содержимое проектного переопределения
- [x] `getTemplateContent(arch, category, name): Promise<string | null>` — содержимое общего шаблона
- [x] `isFileNonEmpty(path): Promise<boolean>` — существует и не пуст после `.trim()`
- [x] Архитектуры: `frontend`, `backend`, `fullstack` — единообразная обработка
- [x] `getAvailableArchitectures(): Promise<Architecture[]>` — возвращает только те архитектуры, чьи папки существуют в `context/rules/`. Fullstack показывается в опроснике только если есть `context/rules/fullstack/`

**Зависимости:** Этап 2.

**Definition of Done:**
- `listFrameworks('frontend')` → `['angular-guidelines', 'only-node', 'without-framework']`
- `listPackages('frontend')` → `['angular-material', 'tailwind', 'typescript']`
- `hasProjectOverride` различает: нет файла, пустой, заполненный
- `fullstack` работает так же, как `frontend`/`backend`

---

## Этап 5: Интерактивный опросник

**Цель:** Полный опросник (шаги 2-7 PRD) через `@clack/prompts`.

**Задачи:**
- [x] Шаг 2: Проверка `spec.md` в `context/projects/<name>/rules/`. Если нет/пуст → «Continue without project spec?»
- [x] Шаг 3: Radio-выбор архитектуры — динамический список из `getAvailableArchitectures()`
- [x] Шаг 3b (NEW): Проверка `userprompt.md` — проектный → общий. Если нет/пуст → warning: «Userprompt file not found. It is highly recommended to create one. Continue without it?»
- [x] Шаг 4: Выбор фреймворков. Frontend/Backend → radio. Fullstack → multiselect (из `context/rules/fullstack/frameworks/` ТОЛЬКО). Пустая папка → warning + continue/cancel
- [x] Шаг 5: Multiselect пакетов из `listPackages(arch)`. Пустая папка → warning + continue/cancel
- [x] Шаг 6: Информирование об источнике workflow (проектный / общий). Пустой → warning + continue/cancel
- [x] Шаг 7: Multiselect AI-агентов (Claude Code, Cursor, Gemini, Codex, Continue, etc.)
- [x] Cancel на любом шаге → чистый выход, ничего не создано
- [x] Возврат `Answers` — структурированный объект со всеми выборами
  ```ts
  interface Answers {
    architecture: Architecture;
    userprompt: string | null;       // null если не найден или пользователь пропустил
    frameworks: string[];            // всегда массив
    packages: string[];
    workflowSource: 'project' | 'general';
    agents: string[];
  }
  ```

**Зависимости:** Этап 4.

**Definition of Done:**
- Полный проход Шаг 2 → Шаг 7 без ошибок
- Cancel → чистый выход
- `Answers` содержит все поля для компиляции
- Предупреждения о пустых папках выводятся на английском

---

## Этап 6: Компилятор правил

**Цель:** На основе `Answers` собрать содержимое для `.agents/rules/`.

**Задачи:**
- [x] `compileUserprompt(answers, projectName): Promise<CompiledFile | null>` — проектное или `context/rules/<arch>/userprompt.md`. Если `hasUserprompt=false` → `null`
- [x] `compileSpec(projectName): Promise<CompiledFile | null>` — только проектное переопределение. Если нет → `null`
- [x] `compileArchitecture(answers, projectName): Promise<CompiledFile | null>` — проектное или `context/rules/<arch>/architecture.md`, через `??`
- [x] `compileFrameworks(answers): Promise<CompiledFile[]>` — для каждого в `answers.frameworks` читает `context/rules/<arch>/frameworks/<name>.md`
- [x] `compileWorkflow(answers, projectName): Promise<CompiledFile | null>` — проектное или общее, по `answers.workflowSource`
- [x] `compilePackageRules(answers): Promise<CompiledFile | null>` — если `packages` не пуст: `# Code Style & Tools` + конкатенация. Пусто → `null`
- [x] `compile(answers, projectName): Promise<CompiledFile[]>` — агрегация в порядке приоритета, `null` фильтруются

**Зависимости:** Этап 4.

**Definition of Done:**
- [x] `compileUserprompt` → `null` при отсутствии userprompt.md или `hasUserprompt=false`
- [x] `compileSpec` → `null` при отсутствии проектного spec.md
- [x] `compileFrameworks` → 1 файл для frontend/backend, N файлов для fullstack
- [x] `compilePackageRules` → `null` при пустом `answers.packages`
- [x] `compilePackageRules` → `# Code Style & Tools\n\n<content1>\n\n<content2>`
- [x] Имя фреймворк-файла = `{name}.md`

---

## Этап 7: Генераторы агентских файлов

**Цель:** Генерация главных файлов для каждого поддерживаемого AI-агента.

**Задачи:**
- [x] `GeneratorContext` — `hasUserprompt`, `hasWorkflow`, `hasSpec`, `hasArchitecture`, `frameworkFiles[]`, `hasPackageRules`
- [x] `AgentGenerator = (ctx: GeneratorContext) => AgentFile[]` — возвращает массив (claude-code → 2 файла)
- [x] `generateClaudeMd` — CLAUDE.md + AGENTS.md (идентичный контент, разные имена). Таблица с динамическими строками. Приоритеты фиксированные (P1–P6), отсутствующие файлы → нет строки
- [x] `generateCursorRules` — `.cursorrules`, упрощённый формат, те же приоритеты
- [x] Заглушки для Gemini, Codex, Continue — возвращают один файл-заглушку
- [x] `getGenerator(key)` — поиск в registry `Map<AgentKey, AgentGenerator>`

**Зависимости:** нет (только generator.types). Может идти параллельно с Этапами 5-6.

**Definition of Done:**
- [x] CLAUDE.md + AGENTS.md: userprompt на P1 (CRITICAL) если есть. Отсутствует → нет строки. Framework-файлы — N строк на P5. package-rules — только если есть
- [x] `.cursorrules` — ссылки в таблице, приоритеты согласно PRD
- [x] Gemini, Codex, Continue — заглушки с TODO
- Gemini, Codex, Continue — заглушки с TODO

---

## Этап 8: Модуль вывода и обработка существующих файлов

**Цель:** Запись всех файлов в `process.cwd()` с обработкой конфликтов.

**Задачи:**
- [x] `writeRulesDir(files: CompiledFile[]): Promise<void>` — `.agents/rules/`, всегда перезапись (sync)
- [x] `fileExists(relativePath): Promise<boolean>` — проверка существования файла
- [x] `writeAgentFile(relativePath, content, mode): Promise<void>` — create/overwrite/append
  - create: новый файл, с созданием родительских директорий
  - overwrite: полная замена
  - append: новый контент + разделитель + старый контент
- [x] `isInGitignore(filename): Promise<boolean>` — проверка наличия строки в `.gitignore`
- [ ] Логика Overwrite/Append/Skip (спрашивать пользователя) — в Оркестраторе (Этап 9), использует `fileExists` + `writeAgentFile`
- [ ] ASCII-арт — в Оркестраторе

**Зависимости:** Этап 2 (utils/fs), Этап 6 (CompiledFile тип).

**Definition of Done:**
- [x] `.agents/rules/` создаётся со всеми файлами
- [x] Перезапись `.agents/rules/` работает (sync-механизм)
- [x] Agent-файлы создаются с поддержкой вложенных путей (`.cursor/rules/`, `.continue/rules/`)
- [x] Append prepends новый контент перед старым
- [x] `isInGitignore` находит точное совпадение строки

---

## Этап 9: Оркестратор (главный flow)

**Цель:** Связать все модули, единая точка входа.

**Задачи:**
- [x] `OrchestratorService` — принимает все сервисы через DI + projectName
- [x] `resolveAnswers()` — config найден → «Use existing?»; нет → опросник
- [x] `configToAnswers()` — восстановление Answers из Config + файловой системы
- [x] `resolveWriteMode()` — интерактивный выбор Overwrite/Append/Skip для существующих файлов
- [x] `suggestGitignore()` — проверка и рекомендация
- [x] `buildGeneratorContext()` — из CompiledFile[] (точный слепок того, что реально создано)
- [x] `buildConfig()` — Answers → Config для сохранения
- [x] `src/index.ts` — создание всех экземпляров, запуск orchestrator.run()

**Зависимости:** Все предыдущие этапы.

**Definition of Done:**
- [x] Без конфига → опросник → компиляция → запись → успех
- [x] С конфигом → «Use existing?» → пропуск опросника → перегенерация
- [x] Overwrite/Append/Skip при существующих agent-файлах
- [x] `.gitignore` рекомендация
- [x] `dist/index.js` = 16.48 KB (весь код, не 42 байта)
- [x] 103 теста, format, lint, typecheck, build — чисто

---

## Этап 10: Обработка граничных случаев и полировка

**Цель:** Надёжное поведение во всех нештатных сценариях.

**Задачи:**
- [ ] Все сообщения на английском, единообразный стиль
- [ ] Пустая папка `frameworks/` или `packages/` → warning + continue
- [ ] Повреждённый конфиг → warning + переход к опроснику
- [ ] Нет прав на запись → понятная ошибка
- [ ] Ctrl+C во время опросника → чистый выход
- [ ] `context/rules/` не найден рядом с `dist/index.js` (ошибка сборки пакета) → понятная ошибка
- [ ] Удалить отладочные `console.log`, оставить только пользовательские сообщения

**Зависимости:** Этап 9.

**Definition of Done:**
- Все сценарии проверены вручную
- Нет частичных/мусорных файлов при ошибках
- Все сообщения на английском

---

## Этап 11: Сборка и дистрибуция

**Цель:** Настройка публикации пакета для обоих режимов запуска.

**Задачи:**
- [ ] `tsup` компилирует `src/` → `dist/index.js` (ESM, minified)
- [ ] `package.json`: `"files": ["dist/", "context/"]` — шаблоны попадают в пакет
- [ ] `package.json`: `"exports"` или `"bin"` для запуска через `npx`
- [ ] Проверить `import.meta.url` после компиляции tsup (не теряется ли в ESM-бандле)
- [ ] Smoke test: `npx github:user/repo` из тестового проекта
- [ ] Smoke test: `node path/to/dist/index.js` из тестового проекта
- [ ] Инструкция в README по использованию в обоих режимах

**Зависимости:** Этап 10.

**Definition of Done:**
- `npm pack` → архив с `dist/` и `context/`
- `npx` запуск работает из произвольной директории
- `node` запуск работает идентично
- Оба режима дают одинаковый результат

---

## Этап 12: Тестирование

**Цель:** Покрыть ключевую логику автоматическими тестами.

**Задачи:**
- [ ] Юнит-тесты: `utils.ts` (пути, хелперы)
- [ ] Юнит-тесты: `config.ts` (чтение/запись/валидация)
- [ ] Юнит-тесты: `discovery.ts` (на временной `rules/` структуре)
- [ ] Юнит-тесты: `compiler.ts` (все функции компиляции)
- [ ] Юнит-тесты: генераторы агентских файлов
- [ ] Интеграционный тест: полный прогон с мок-`rules/`

**Зависимости:** Можно параллельно с Этапами 8-11.

**Definition of Done:**
- Покрыты: utils, config, discovery, compiler, generators
- Интеграционный тест: полный цикл с мок-данными
- `npm test` выполняет все тесты

---

## Диаграмма зависимостей

```
1 (Bootstrap)
  │
  ▼
2 (Utils)
  │
  ├──▶ 3 (Config)
  │      │
  ├──▶ 4 (Discovery)
  │      │
  │      ├──▶ 5 (Prompts)
  │      │      │
  │      ├──▶ 6 (Compiler)
  │      │      │
  │      │      ├──▶ 8 (Output) ──▶ 9 (Orchestrator) ──▶ 10 (Polish) ──▶ 11 (Build)
  │      │      │                                                       │
  ├──▶──┼──────▶ 7 (Generators) ──────────────────────────────────────┘
  │      │
  └──────┴──────▶ 12 (Testing) — параллельно с 8-11
```

---

## Оценка трудозатрат

| Этап | Часов |
|---|---|
| 1. Bootstrap | 0.5 |
| 2. Utils | 2 |
| 3. Config | 2 |
| 4. Discovery | 3 |
| 5. Prompts | 4 |
| 6. Compiler | 3 |
| 7. Generators | 4 |
| 8. Output | 4 |
| 9. Orchestrator | 3 |
| 10. Polish | 3 |
| 11. Build | 2 |
| 12. Testing | 6 |
| **Итого** | **~36.5** |