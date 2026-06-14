# ADR 001 — Repository Structure: Root vs app/

## Context

Нужно разделить governance-слой (документация, конфигурация агента) и код приложения, чтобы Claude не путал их и не создавал код в корне репо.

## Decision

- `CLAUDE.md`, `README.md`, `docs/**` — только в корне репо.
- Весь код Vite + React + TypeScript — только в `app/`.
- Root `package.json` содержит pass-through scripts (`npm --prefix app run ...`).
- Единственный `.gitignore` — в корне. `app/.gitignore` удалён.

## Consequences

- Claude всегда читает `CLAUDE.md` в корне и знает структуру.
- `app/` можно заменить другим фреймворком без изменения governance.
- Root-level CI конфиги (.github/, etc.) допустимы; app-код в корне — нет.
