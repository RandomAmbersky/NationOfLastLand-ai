# Todo List - Frontend Improvements

## ✅已完成

1. **Смешение ответственности** - **ВЫПОЛНЕНО**
   - ✅ `RendererSystem` делегирует создание сущностей `EntitySpawnSystem`
   - `GameStateSystem` управляет состоянием и WASM (intentional - it's the game state bridge)

2. **Дублирование координатной трансформации** - **ЧАСТИЧНО ИСПРАВЛЕНО**
   - ✅ `RendererSystem` использует `_getTransformer()` и `_toScreenCoords()`
   - ⚠️ `InputSystem`, `SelectionSystem`, `SelectionIndicator` еще используют дублированную логику
   - ✅ Убран fallback логика с `this.entityService` в `RendererSystem._syncEntities`

## 🟡 Архитектурные проблемы

1. **StateContainer не является истинным источником истины**
   - ❌ `RendererSystem._renderedEntities` хранит дублирующую информацию
   - ❌ `SelectionIndicator` работает напрямую с Pixi контейнерами
   - **СТАТУС**: Требует архитектурной переработки

2. **Отсутствие централизованного CoordinateService** - **ЧАСТИЧНО ИСПРАВЛЕНО**
   - ✅ `CoordinateTransformer` существует и экспортируется
   - ✅ `RendererSystem` использует `_getTransformer()` и `_toScreenCoords()`
   - ⚠️ `InputSystem` использует встроенные `_toGameCoords()` и `_getScale()` вместо transformer
   - ⚠️ `SelectionSystem` использует встроенный `_getScale()` вместо transformer
   - ⚠️ `SelectionIndicator` использует `_getApp()` вместо transformer
   - **СТАТУС**: Основное дублирование частично устранено, требуется интеграция в остальные системы

3. **Непоследовательный обмен данными**
   - ⚠️ Системы получают `gameEngine` в конструкторе
   - ❌ Нет явного API для взаимодействия между системами
   - **СТАТУС**: Требует архитектурной переработки

## ✅ Исправленные проблемы

4. **Ошибки в `_syncEntities`** - **ИСПРАВЛЕНО**
   - ✅ Убран fallback логика с `this.entityService` (неиспользуемый код)
   - ✅ `RendererSystem` делегирует спавн `EntitySpawnSystem.processSpawns()` и `processDeletions()`

5. **Утечки памяти** - **ЧАСТИЧНО**
   - ✅ `RendererSystem.destroy()` очищает контейнеры и устанавливает `transformer = null`
   - ✅ `SelectionIndicator.destroy()` очищает индикаторы
   - ⚠️ `InputSystem.destroy()` не очищает transformer (отсутствует)
   - **СТАТУС**: Требует добавления cleanup для всех систем

6. **Дублирование координатной трансформации** - **ЧАСТИЧНО ИСПРАВЛЕНО**
   - ✅ `RendererSystem._toScreenCoords()` / `_getTransformer()`
   - ⚠️ `InputSystem._toGameCoords()` / `_getScale()` - используется напрямую без transformer
   - ⚠️ `SelectionSystem._getScale()` - используется напрямую без transformer
   - ⚠️ `SelectionIndicator` - требует интеграции transformer

## 🟢 Рекомендации по улучшению

### Приоритет 2 (важно)

- [x] Вынести логику создания/удаления сущностей в отдельный `EntitySpawnSystem` - **ВЫПОЛНЕНО**

### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами
- [ ] Интегрировать `CoordinateTransformer` в `InputSystem` (замена `_toGameCoords()` и `_getScale()`)
- [ ] Интегрировать `CoordinateTransformer` в `SelectionSystem` (замена `_getScale()`)
- [ ] Интегрировать `CoordinateTransformer` в `SelectionIndicator` (замена `_getApp()`)
- [ ] Устранить дублирование `_renderedEntities` в `RendererSystem`
  - 📝 `_renderedEntities` используется для быстрого доступа к отрисованным сущностям без поиска по state.entities
- [ ] Добавить документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему
