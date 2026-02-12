# Todo List - Frontend Improvements

## 🟡 Архитектурные проблемы

### 1. **StateContainer не является истинным источником истины**
- ❌ `RendererSystem._renderedEntities` хранит дублирующую информацию
- ❌ `SelectionIndicator` работает напрямую с Pixi контейнерами
- **СТАТУС**: Требует архитектурной переработки

### 2. **Критическое дублирование логики координатной трансформации** ⚠️ КРИТИЧНО
- ❌ `EntitySpawnSystem` использует `_getScale()` (строка 122) вместо `CoordinateTransformer`
- ❌ `InputSystem` использует `_toGameCoords()` (строка 231) и `_getScale()` вместо `CoordinateTransformer`
- ❌ `SelectionSystem` использует `_getScale()` (строка 65) вместо `CoordinateTransformer`
- ❌ `SelectionIndicator` использует `_getApp()` вместо `CoordinateTransformer`
- ⚠️ `RendererSystem` частично использует `CoordinateTransformer` через `_getTransformer()`
- **СТАТУС**: Все системы кроме `RendererSystem` имеют свою логику трансформации

### 3. **Непоследовательный обмен данными**
- ⚠️ Системы получают `gameEngine` в конструкторе
- ❌ Нет явного API для взаимодействия между системами
- **СТАТУС**: Требует архитектурной переработки

## ⚠️ Недостаточно исправленные проблемы

### 4. **Ошибки в `_syncEntities`** - **НЕИСПРАВЛЕНО**
- ❌ В `RendererSystem._syncEntities` (строка 356-378) fallback логика с `this.entitySpawnSystem` **присутствует**
- ✅ `RendererSystem` делегирует спавн `EntitySpawnSystem.processSpawns()` и `processDeletions()`
- **СТАТУС**: Частичное делегирование, fallback код не удален

### 5. **Утечки памяти**
- ✅ `RendererSystem.destroy()` очищает контейнеры и устанавливает `transformer = null`
- ✅ `SelectionIndicator.destroy()` очищает индикаторы
- ❌ `InputSystem.destroy()` не очищает transformer (отсутствует)
- ❌ `EntitySpawnSystem.destroy()` не очищает transformer (отсутствует)
- ❌ `SelectionSystem.destroy()` не очищает transformer (отсутствует)
- **СТАТУС**: Требует добавления cleanup для всех систем

### 6. **EntitySpawnSystem дублирует логику** - **НЕИСПРАВЛЕНО**
- ❌ `EntitySpawnSystem` имеет `_getScale()` и `_normalizeCoords()` вместо использования `CoordinateTransformer`
- ❌ Дублирование логики: `RendererSystem._toScreenCoords()` и `EntitySpawnSystem._getScale()` делают одно и то же
- **СТАТУС**: Требует рефакторинга на `CoordinateTransformer`

## 📋 Рекомендации по улучшению

### Приоритет 1 (критично)

- [ ] Интегрировать `CoordinateTransformer` во все системы:
  - [ ] `EntitySpawnSystem` - замена `_getScale()` и `_normalizeCoords()`
  - [ ] `InputSystem` - замена `_toGameCoords()` и `_getScale()`
  - [ ] `SelectionSystem` - замена `_getScale()`
  - [ ] `SelectionIndicator` - замена `_getApp()`
- [ ] Удалить дублирующую логику трансформации из всех систем
- [ ] Добавить `destroy()` для очистки transformer во всех системах

### Приоритет 2 (важно)

- [ ] Вынести логику создания/удаления сущностей в отдельный `EntitySpawnSystem` - **ВЫПОЛНЕНО**
- [ ] Удалить fallback логику из `RendererSystem._syncEntities`
- [ ] Устранить дублирование `_renderedEntities` в `RendererSystem`
  - 📝 `_renderedEntities` используется для быстрого доступа к отрисованным сущностям без поиска по state.entities

### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами
- [ ] Добавить документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему
