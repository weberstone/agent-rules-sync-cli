# Roadmap

Этапы спроектированы так, чтобы каждый давал завершённый, проверяемый результат. Зависимости минимальны — этап зависит только от предыдущего (реже от двух).

---

## Этап 1: Инициализация проекта

**Цель:** Скелет проекта, способный скомпилироваться в `dist/index.js`.

**Задачи:**
- [x] `package.json` — name, version, `"type": "module"`, dependencies (`@clack/prompts`, `picocolors`), devDependencies (`tsup`, `typescript`, `@types/node`), `"files": ["dist/", "rules/"]`
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
- [x] `getRulesDir()` — `path.join(getSourceDir(), 'rules')`
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
    framework: string;
    packages: string[];
    agents: string[];
    lastSync: string; // ISO 8601
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

**Цель:** Сканирование `rules/` и возврат доступных опций для каждого шага опросника.

**Задачи:**
- [x] Переименовать `rules/*/package/` → `rules/*/packages/` (привести к каноническому имени)
- [x] `listFrameworks(arch): Promise<string[]>` — сканирует `rules/<arch>/frameworks/`, имена файлов без `.md`
- [x] `listPackages(arch): Promise<string[]>` — сканирует `rules/<arch>/packages/`
- [x] `hasProjectOverride(projectName, fileName): Promise<boolean>` — непустой файл в `rules/projects/<projectName>/`
- [x] `getProjectOverride(projectName, fileName): Promise<string | null>` — содержимое проектного переопределения
- [x] `getTemplateContent(arch, category, name): Promise<string | null>` — содержимое общего шаблона
- [x] `isFileNonEmpty(path): Promise<boolean>` — существует и не пуст после `.trim()`
- [x] Архитектуры: `frontend`, `backend`, `fullstack` — единообразная обработка
- [x] `getAvailableArchitectures(): Promise<Architecture[]>` — возвращает только те архитектуры, чьи папки существуют в `rules/`. Fullstack показывается в опроснике только если есть `rules/fullstack/`

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
- [ ] Шаг 2: Проверка `spec.md` в `rules/projects/<name>/`. Если нет/пуст → вопрос «continue without project spec?»
- [ ] Шаг 3: Radio-выбор: `Frontend` / `Backend` / `Fullstack`
- [ ] Шаг 4: Radio-выбор фреймворка из `listFrameworks(arch)`. Пустая папка → warning + continue/cancel
- [ ] Шаг 5: Multiselect пакетов из `listPackages(arch)`. Пустая папка → warning + continue/cancel
- [ ] Шаг 6: Информирование об источнике workflow (проектный / общий). Пустой → warning + continue/cancel
- [ ] Шаг 7: Multiselect AI-агентов (Claude Code, Cursor, Gemini, Codex, Continue, etc.)
- [ ] Cancel на любом шаге → чистый выход, ничего не создано
- [ ] Возврат `Answers` — структурированный объект со всеми выборами

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
- [ ] `compileSpec(answers): Promise<CompiledFile | null>` — проектное переопределение. Если нет → `null` (не ошибка, файл не создаётся)
- [ ] `compileArchitecture(answers): Promise<CompiledFile>` — проектное или `rules/<arch>/architecture.md`
- [ ] `compileFramework(answers): Promise<CompiledFile>` — выбранный файл из `rules/<arch>/frameworks/`. Выходное имя = имя исходного файла (например, `angular-guidelines.md`)
- [ ] `compileWorkflow(answers): Promise<CompiledFile>` — проектное или `rules/<arch>/workflow.md`
- [ ] `compilePackageRules(answers): Promise<CompiledFile | null>` — если выбраны пакеты: `# Code Style & Tools` + конкатенация содержимого. Если ничего не выбрано → `null`
- [ ] `compileAll(answers): Promise<CompiledFile[]>` — агрегирует всё (исключая `null`)

**Зависимости:** Этап 4.

**Definition of Done:**
- `compileSpec` → `null` при отсутствии проектного spec.md
- `compilePackageRules` → `null` при пустом `answers.packages`
- `compilePackageRules` → `# Code Style & Tools\n\n<content1>\n\n<content2>` при выбранных пакетах
- Имя фреймворк-файла совпадает с именем исходного (не буквальное `frameworkname.md`)

---

## Этап 7: Генераторы агентских файлов

**Цель:** Генерация главных файлов для каждого поддерживаемого AI-агента.

**Задачи:**
- [ ] Тип `AgentGenerator = (context: GeneratorContext) => { filename: string; content: string }`
  - `GeneratorContext` содержит: `rulesPath`, `frameworkFile`, `hasPackageRules`, `agents` etc.
- [ ] `generateClaudeMd` — CLAUDE.md с таблицей приоритетов и ссылками на `.agents/rules/`. Ссылка на package-rules.md только если он создан
- [ ] `generateAgentsMd` — AGENTS.md (аналогичен CLAUDE.md)
- [ ] `generateCursorRules` — `.cursorrules` с референсами
- [ ] Заглушки для Gemini, Codex, Continue — `TODO: define format`
- [ ] Реестр: `Map<string, AgentGenerator>` — выбор генератора по ключу

**Зависимости:** Этап 2 (утилиты). Может идти параллельно с Этапами 5-6.

**Definition of Done:**
- CLAUDE.md генерируется с динамической таблицей (framework-файл назван правильно, package-rules — опционально)
- AGENTS.md структурно идентичен CLAUDE.md
- `.cursorrules` содержит ссылки в корректном формате
- Gemini, Codex, Continue — заглушки с TODO

---

## Этап 8: Модуль вывода и обработка существующих файлов

**Цель:** Запись всех файлов в `process.cwd()` с обработкой конфликтов.

**Задачи:**
- [ ] `writeRulesDir(files: CompiledFile[]): Promise<void>` — `.agents/rules/` + все файлы (перезапись всегда, это sync)
- [ ] `handleExistingAgentFile(filename, newContent): Promise<'overwrite' | 'append' | 'skip'>`:
  - Файла нет → `overwrite` (создать)
  - Файл есть → вопрос пользователю: Overwrite / Append / Skip
  - Overwrite → полная замена
  - Append → текущий контент + ссылка на `.agents/rules/` в начало
  - Skip → ничего
- [ ] `writeAgentFiles(selectedAgents, context): Promise<void>` — для каждого агента: генерация + handleExisting
- [ ] `suggestGitignore(targetDir)` — проверка `.gitignore` на наличие `ai-rules-config.json`, вывод рекомендации. Сам файл **не модифицируется**
- [ ] ASCII-арт и финальное сообщение (минималистичный Ктулху)

**Зависимости:** Этап 6, Этап 7.

**Definition of Done:**
- `.agents/rules/` создаётся со всеми актуальными файлами
- Существующий CLAUDE.md → диалог Overwrite/Append/Skip
- Append сохраняет старый контент, добавляет ссылку в начало
- Skip не трогает файл
- Рекомендация про `.gitignore` выводится

---

## Этап 9: Оркестратор (главный flow)

**Цель:** Связать все модули в `src/index.ts`.

**Задачи:**
- [ ] Pre-flight: `rules/` доступна? Нет → ошибка, выход
- [ ] Ветка А: Конфиг найден → «Use existing config or start fresh?»
  - Use existing → пропуск опросника, компиляция из конфига
  - Start fresh → опросник → компиляция
- [ ] Ветка Б: Конфиг не найден → опросник → компиляция
- [ ] Pipeline: Answers → `compileAll` → `writeRulesDir` → `writeAgentFiles` → `writeConfig` → `suggestGitignore` → ASCII art
- [ ] Глобальный try/catch с понятными сообщениями

**Зависимости:** Этап 3, Этап 5, Этап 8.

**Definition of Done:**
- Без конфига → опросник → генерация
- С конфигом → «Use?» → генерация без опросника
- «Start fresh» → опросник → перезапись конфига
- Ошибка → понятное сообщение

---

## Этап 10: Обработка граничных случаев и полировка

**Цель:** Надёжное поведение во всех нештатных сценариях.

**Задачи:**
- [ ] Все сообщения на английском, единообразный стиль
- [ ] Пустая папка `frameworks/` или `packages/` → warning + continue
- [ ] Повреждённый конфиг → warning + переход к опроснику
- [ ] Нет прав на запись → понятная ошибка
- [ ] Ctrl+C во время опросника → чистый выход
- [ ] `rules/` не найден рядом с `dist/index.js` (ошибка сборки пакета) → понятная ошибка
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
- [ ] `package.json`: `"files": ["dist/", "rules/"]` — шаблоны попадают в пакет
- [ ] `package.json`: `"exports"` или `"bin"` для запуска через `npx`
- [ ] Проверить `import.meta.url` после компиляции tsup (не теряется ли в ESM-бандле)
- [ ] Smoke test: `npx github:user/repo` из тестового проекта
- [ ] Smoke test: `node path/to/dist/index.js` из тестового проекта
- [ ] Инструкция в README по использованию в обоих режимах

**Зависимости:** Этап 10.

**Definition of Done:**
- `npm pack` → архив с `dist/` и `rules/`
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