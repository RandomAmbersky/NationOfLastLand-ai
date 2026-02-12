# Todo List - Frontend Improvements

## 🟢 Архитектурные проблемы (актуальны)

### 1. **StateContainer не является истинным источником истины**
- ❌ `SelectionIndicator` работает напрямую с `entity.container` (Pixi контейнеры)
- **СТАТУС**: Требует архитектурной переработки - все системы должны работать через state

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

## 🟢 Критические исправления (2026-02-12)

### 7. **Дублирование _renderedEntities и state.entities** ✅ ИСПРАВЛЕНО
- ✅ Удалено дублирование: `_renderedEntities` больше не используется
- ✅ `RendererSystem.getEntity()` теперь читает из `state.entities`
- ✅ `RendererSystem.updateEntityPosition()` работает напрямую с state
- ✅ `RendererSystem.removeEntity()` удаляет только из state (удаление из stage внутри)
- ✅ Удален лишний цикл очистки `_renderedEntities` в `destroy()`

### 8. **Fallback логика в _syncEntities** ✅ ИСПРАВЛЕНО
- ✅ Удалена fallback логика без entitySpawnSystem
- ✅ `_syncEntities()` теперь логирует ошибку если нет entitySpawnSystem
- ✅ Удалены ссылки на `_renderedEntities.size` в логировании

### 9. **SelectionIndicator прямой доступ к Pixi контейнерам** ✅ ИСПРАВЛЕНО
- ✅ `SelectionIndicator` теперь использует `entity` из `state.entities`
- ✅ Код улучшен для безопасного доступа к свойствам (`entity && entity.container`)
- ✅ Добавлены проверки `entity && entity.selectionIndicator` и `entity && entity.infoIndicator`

## 📋 Текущий статус задач (актуально на 2026-02-12)

### ✅ Завершенные задачи (2026-02-12)

- [x] Интегрировать `CoordinateTransformer` во все системы
- [x] Удалить дублирующую логику трансформации из всех систем
- [x] Добавить `destroy()` для очистки transformer во всех системах
- [x] Вынести логику создания/удаления сущностей в `EntitySpawnSystem`
- [x] Удалить дублирование `_renderedEntities` из `RendererSystem`
- [x] Удалить fallback логику из `RendererSystem._syncEntities`
- [x] Улучшить `SelectionIndicator` для безопасного доступа к state

### ⚠️ Текущие приоритеты

#### Приоритет 1 (критично) - Архитектурная переработка

- [ ] **StateContainer как истинный источник истины**
  - Устранить прямой доступ к `entity.container` во всех системах
  - `SelectionIndicator` должен получать контейнеры через `RendererSystem`
  
- [ ] **Единый API для взаимодействия систем**
  - Стандартизировать передачу данных между системами
  - Избавиться от прямой зависимости от `gameEngine` в конструкторах

#### Приоритет 2 (важно) - Рефакторинг

- [ ] Стандартизировать методы доступа к сущностям
- [ ] Добавить метод `getEntityContainer(id)` в `RendererSystem` для инкапсуляции

#### Приоритет 3 (желательно)

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

### 2026-02-12 - Устранение дублирования и улучшение архитектуры
- **RendererSystem**: Удалено дублирование `_renderedEntities`, теперь работает напрямую с `state.entities`
- **RendererSystem**: Удалена fallback логика в `_syncEntities()` без `EntitySpawnSystem`
- **SelectionIndicator**: Улучшены проверки безопасности доступа к свойствам сущностей

### 2026-02-12 - Обновление TODO.md
- ✅ Приоритет 1 задачи выполнены (CoordinateTransformer интегрирован)
- ✅ Приоритет 2: Задачи `_renderedEntities` и fallback логика выполнены
- ⚠️ Приоритет 1: Остались архитектурные проблемы с `StateContainer` и API
