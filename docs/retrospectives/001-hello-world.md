# Retrospective 001 — Hello World Bootstrap

## What we did

Создали структуру репо с governance в корне и кодом в `app/`, установили Vite + React + TS, настроили vitest/eslint/prettier, прошли spec-first цикл для hello world greeting, запустили dev server.

## What worked

- Vite уже поставляет eslint.config.js с flat config и нужными плагинами — дополнительная настройка минимальна.
- Spec-first цикл: красный тест → модуль → зелёный тест — работает чисто.
- Root pass-through scripts через `--prefix app` — удобно, не нужны npm workspaces.

## What didn't / friction points

- `nc` (netcat) отсутствует на Windows — заменили port probe на PowerShell `TcpClient`. Это нужно учитывать в будущих скриптах.
- `eslint-plugin-react` несовместим с ESLint 10 (Vite 8 тащит ESLint 10) — не устанавливали, используем `eslint-plugin-react-hooks`. Зафиксировано в `docs/constraints.md`.
- `.claude/launch.json` не создаём через Claude (ограничение классификатора) — нужно создавать вручную при необходимости.

## Decisions to carry forward

- [ADR 001 — Agent structure](../decisions/001-agent-structure.md)

## Changes made to CLAUDE.md / constraints / working agreement

- Добавлен constraint про `eslint-plugin-react` в `docs/constraints.md`.

## Open questions for next session

- Какую первую бизнес-фичу дашборда строим?
