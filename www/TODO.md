# Todo List - Frontend Improvements

## 🟢 Актуальные архитектурные проблемы

### 1. **StateContainer не является истинным источником истины**
- ❌ `RendererSystem._renderedEntities` хранит дублирующую информацию
- ❌ `SelectionIndicator` работает напрямую с Pixi контейнерами
- **СТАТУС**: Требует архитектурной переработки

### 2. **Непоследовательный обмен данными**
- ⚠️ Системы получают `gameEngine` в конструкторе
- ❌ Нет явного API для взаимодействия между системами
- **СТАТУС**: Требует архитектурной переработки

## ✅ Исправленные критические проблемы (2026-02-12)

### 3. **Критическое дублирование логики координатной трансформации** ✅ ИСПРАВЛЕНО
- ✅ `EntitySpawnSystem` теперь использует `CoordinateTransformer` через `this.transformer.gameToScreen()`
- ✅ `InputSystem` теперь использует `CoordinateTransformer` через `this.transformer.screenToGame()` и `getScale()`
- ✅ `SelectionSystem` теперь использует `CoordinateTransformer` через `this.transformer.getScale()`
- ✅ `SelectionIndicator` теперь использует `CoordinateTransformer` через `this.transformer`
- ✅ `RendererSystem` частично использует `CoordinateTransformer` через `_getTransformer()`

### 4. **Утечки памяти - инициализация** ✅ ИСПРАВЛЕНО
- ✅ `EntitySpawnSystem.init()` инициализирует transformer
- ✅ `InputSystem.init()` инициализирует transformer
- ✅ `SelectionSystem.init()` инициализирует transformer
- ✅ `SelectionIndicator.init()` инициализирует transformer

### 5. **Утечки памяти - cleanup** ✅ ИСПРАВЛЕНО
- ✅ `RendererSystem.destroy()` очищает контейнеры и устанавливает `transformer = null`
- ✅ `SelectionIndicator.destroy()` очищает индикаторы и transformer
- ✅ `InputSystem.destroy()` очищает transformer
- ✅ `EntitySpawnSystem.destroy()` очищает transformer
- ✅ `SelectionSystem.destroy()` очищает transformer

### 6. **EntitySpawnSystem дублирование** ✅ ИСПРАВЛЕНО
- ✅ `EntitySpawnSystem` больше не использует `_getScale()` и `_normalizeCoords()`
- ✅ Использует `CoordinateTransformer.gameToScreen()` для всех преобразований
- ✅ Удалена дублирующая логика: `_getScale()` и `_normalizeCoords()`

## 📋 Рекомендации по улучшению

### Приоритет 1 (критично)

- [x] Интегрировать `CoordinateTransformer` во все системы:
  - [x] `EntitySpawnSystem` - замена `_getScale()` и `_normalizeCoords()` ✅
  - [x] `InputSystem` - замена `_toGameCoords()` и `_getScale()` ✅
  - [x] `SelectionSystem` - замена `_getScale()` ✅
  - [x] `SelectionIndicator` - замена `_getApp()` ✅
- [x] Удалить дублирующую логику трансформации из всех систем ✅
- [x] Добавить `destroy()` для очистки transformer во всех системах ✅

### Приоритет 2 (важно)

- [x] Вынести логику создания/удаления сущностей в отдельный `EntitySpawnSystem` - **ВЫПОЛНЕНО**
- [ ] Удалить fallback логику из `RendererSystem._syncEntities`
- [ ] Устранить дублирование `_renderedEntities` в `RendererSystem`
  - 📝 `_renderedEntities` используется для быстрого доступа к отрисованным сущностям без поиска по state.entities

### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами
- [ ] Добавить документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему

## 📝 История изменений

### 2026-02-12 - Рефакторинг координатных преобразований
- **EntitySpawnSystem**: Внедрен `CoordinateTransformer`, удален `_getScale()` и `_normalizeCoords()`
- **InputSystem**: Внедрен `CoordinateTransformer`, удален `_toGameCoords()` и `_getScale()`
- **SelectionSystem**: Внедрен `CoordinateTransformer`, `_getScale()` теперь через `transformer.getScale()`
- **SelectionIndicator**: Внедрен `CoordinateTransformer`, удален `_getApp()`
- **Все системы**: Добавлены `init(app)` и улучшенные `destroy()` методы с очисткой transformer
- **Tests**: Обновлены все тесты для вызова `init()` перед использованием систем
