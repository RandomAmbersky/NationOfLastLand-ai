# Todo List - Frontend Improvements

## ✅已完成

1. **Смешение ответственности** - **ВЫПОЛНЕНО**
   - ✅ `RendererSystem` делегирует создание сущностей `EntitySpawnSystem`
   - `GameStateSystem` управляет состоянием и WASM (intentional - it's the game state bridge)

2. **Дублирование координатной трансформации** - **ЧАСТИЧНО ИСПРАВЛЕНО**
   - ✅ `RendererSystem`, `InputSystem`, `SelectionSystem` теперь используют `_getTransformer()`
   - ⚠️ `SelectionIndicator` еще использует `_getApp()` вместо transformer
   - ✅ Убран fallback логика с `this.entityService` в `RendererSystem._syncEntities`

## 🟡 Архитектурные проблемы

2. **StateContainer не является истинным источником истины**
   - ❌ `RendererSystem._renderedEntities` хранит дублирующую информацию
   - ❌ `SelectionIndicator` работает напрямую с Pixi контейнерами
   - **СТАТУС**: Требует архитектурной переработки

3. **Отсутствие централизованного CoordinateService** - **ЧАСТИЧНО ИСПРАВЛЕНО**
   - ⚠️ `CoordinateTransformer` существует и экспортируется
   - ✅ `RendererSystem`, `InputSystem`, `SelectionSystem` теперь используют `_getTransformer()` и `_toScreenCoords()`
   - ⚠️ `SelectionIndicator` еще использует `_getApp()` вместо transformer
   - **СТАТУС**: Исправлено основное дублирование, осталась оптимизация `SelectionIndicator`

4. **Непоследовательный обмен данными**
   - ⚠️ Системы получают `gameEngine` в конструкторе
   - ❌ Нет явного API для взаимодействия между системами
   - **СТАТУС**: Требует архитектурной переработки

## ✅ Исправленные проблемы

5. **Ошибки в `_syncEntities`** - **ИСПРАВЛЕНО**
   - ✅ Убран fallback логика с `this.entityService` (неиспользуемый код)
   - ✅ `RendererSystem` делегирует спавн `EntitySpawnSystem.processSpawns()` и `processDeletions()`

6. **Утечки памяти** - **ПРОВЕРЕНО**
   - ✅ `destroy()` methods properly clean up containers and references
   - ✅ Added `transformer = null` cleanup in `InputSystem`, `SelectionSystem`, `SelectionIndicator`

7. **Дублирование координатной трансформации** - **ИСПРАВЛЕНО**
   - ✅ `RendererSystem._toScreenCoords()` / `_getTransformer()`
   - ✅ `InputSystem._toGameCoords()` / `_getTransformer()` / `_getScale()`
   - ✅ `SelectionSystem._getScale()` / `_getTransformer()`
   - ✅ `SelectionIndicator` - частично, осталось интегрировать transformer

## 🟢 Рекомендации по улучшению

### Приоритет 2 (важно)

- [x] Вынести логику создания/удаления сущностей в отдельный `EntitySpawnSystem` - **ВЫПОЛНЕНО**

### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами
- [ ] Создать централизованный `CoordinateService` (использовать `CoordinateTransformer`) - **ЧАСТИЧНО**
  - ✅ Системы теперь используют `_getTransformer()` для доступа к transformer
  - ⚠️ `SelectionIndicator` еще использует `_getApp()` вместо transformer
- [ ] Устранить дублирование `_renderedEntities` в `RendererSystem` - **ОТЛОЖЕНО**
  - 📝 `_renderedEntities` используется для быстрого доступа к отрисованным сущностям без поиска по state.entities
- [ ] Добавить документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему
