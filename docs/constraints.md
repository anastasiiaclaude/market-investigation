# Constraints

## Out of scope (never build)

- Аутентификация и роли — не нужны для локального single-user инструмента.
- Мобильная версия — только десктоп браузер.

## Baseline constraints

- Нет рефакторинга вне текущего scope.
- Нет новых npm-зависимостей без ADR.
- Нет кода без spec-файла.
- Нет пропуска ретроспективы после фичи.
- Governance файлы (`CLAUDE.md`, `docs/**`) — только в корне, никогда в `app/`.
- App-код — только в `app/`, никогда в корне.
- `eslint-plugin-react` несовместим с ESLint 10 (текущая версия Vite) — не устанавливать, использовать `eslint-plugin-react-hooks`.
