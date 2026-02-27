# План проверки units_moving_rules.md

## Правила (источник: units_moving_rules.md)

| # | Правило | Где реализовано | Способ проверки |
|---|---------|-----------------|-----------------|
| 1 | Юнит = то, что на карте (база, машина, алерт) | entityUtils, entityType | Код/тесты типов |
| 2 | Ничего не выбрано + клик по юниту → выбор | SelectionSystem.handleEntityClicked | Unit-тест |
| 3 | Один юнит в группе → подробная информация | UI (entity-info) | Ручная / E2E |
| 4 | Групповое выделение: только юниты игрока и только подвижные | handleEntityClicked (Shift), handleRectangleSelection | Unit-тест |
| 5 | Чужой юнит не остаётся при групповом выделении игрока | handleRectangleSelection | Unit-тест |
| 6 | Подвижные игрока выбраны + клик по чужому → цель группе, выделение не сбрасывается | handleEntityClicked, groupTargetSet | Unit-тест |
| 7 | Неподвижный игрока выбран + клик по другому юниту → сброс и выбор нового | handleEntityClicked | Unit-тест |
| 8 | Чужой выбран + клик по другому юниту → сброс и выбор нового | handleEntityClicked | Unit-тест |
| 9 | ПКМ по пустому месту → сброс выделения | InputSystem → selectionCleared → handleSelectionCleared | Unit-тест Input + Selection |
| 10 | ПКМ по юниту → сброс выделения и выбор этого юнита | InputSystem → entitySelected → handleEntitySelected | Unit-тест |

## Выполнение

1. **Автотесты**: добавлен файл `www/systems/units_moving_rules.test.js` — тесты для правил 2, 4, 5, 6, 7, 8, 9, 10 против реального `SelectionSystem`.
2. **Правило 3**: отображение подробной информации при одном выбранном юните — логика UI (панель entity-info); проверяется вручную.
3. **InputSystem**: правила 9 и 10 (ПКМ пусто / ПКМ юнит) реализованы в `_handleRightMouseDown` и покрыты тестами в `InputSystem.test.js` (entitySelected / selectionCleared).

## Результат проверки (27.02.2025)

- `npm test -- --testPathPattern="units_moving_rules|SelectionSystem|InputSystem"`: **все тесты пройдены** (SelectionSystem, units_moving_rules, InputSystem).
- Полный `npm test` падает только на `GameStateSystem.test.js` из-за импорта WASM (pkg) — существующая ограничение окружения Jest, не связано с правилами выделения.
