# Todo List - Frontend Improvements

## 🟡 Архитектурные проблемы (требуют внимания)

### 1. **StateContainer не является истинным источником истины для контейнеров**
- ❌ `SelectionIndicator` работает напрямую с `entity.container` (addChild, removeChild)
- ❌ `EntitySpawnSystem` работает напрямую с `app.stage` для добавления/удаления контейнеров
- ✅ Системы взаимодействуют через `gameEngine.state` (EventEmitter паттерн)
- **СТАТУС**: Требует архитектурной переработки - методы работы с контейнерами должны быть инкапсулированы в `RendererSystem`

### 2. **Непоследовательный обмен данными**
- ⚠️ Системы получают `gameEngine` в конструкторе (паттерн архитектуры)
- ✅ Взаимодействие через `gameEngine.state` (EventEmitter) для событий
- ❌ Нет стандартного API для прямого взаимодействия систем друг с другом
- **СТАТУС**: Архитектура использует StateContainer как EventBus, прямые зависимости через gameEngine

## ✅ Завершенные задачи

### 3. **Удаление дублирования _renderedEntities** ✅ ИСПРАВЛЕНО (2026-02-12)
- ✅ `RendererSystem.getEntity()` читает из `state.entities`
- ✅ `RendererSystem.updateEntityPosition()` работает с state
- ✅ Удален лишний цикл очистки в `destroy()`

### 4. **Fallback логика в _syncEntities** ✅ ИСПРАВЛЕНО (2026-02-12)
- ✅ Удалена fallback логика без entitySpawnSystem
- ✅ `_syncEntities()` логирует ошибку если нет entitySpawnSystem

### 5. **Интеграция CoordinateTransformer** ✅ ЗАВЕРШЕНО (2026-02-12)
- ✅ `CoordinateTransformer` внедрен во все системы
- ✅ Удалена дублирующая логика трансформации из всех систем
- ✅ Добавлены `init(app)` и улучшенные `destroy()` методы

## 📋 Текущий статус задач (актуально на 2026-02-12)

### ⚠️ Приоритет 1 (критично) - Архитектурная переработка

- [ ] **Инкапсуляция работы с Pixi контейнерами в RendererSystem**
  - `SelectionIndicator` должен получать контейнеры через `RendererSystem.getEntityContainer(id)`
  - Убрать прямой доступ к `entity.container` из `SelectionIndicator` (lines 30, 36, 43)
  - Убрать прямой доступ к `app.stage` из `EntitySpawnSystem` (lines 85, 90, 133, 139)
  
- [ ] **Единый API для взаимодействия систем**
  - Стандартизировать методы доступа к сущностям между системами
  - Рассмотреть внедрение `RendererSystem` в другие системы вместо прямой зависимости от `gameEngine`

### ⚠️ Приоритет 2 (важно) - Рефакторинг

- [ ] **Добавить инкапсулирующий API в `RendererSystem`**:
  - [ ] `getEntityContainer(id)` - получить контейнер сущности
  - [ ] `getEntityGraphics(id)` - получить graphics сущности
  - [ ] `getEntityCoordinates(id)` - получить gameX/gameY сущности
  - [ ] `addEntityToContainer(entity, container)` - добавить в контейнер (скрыть детали addChild)
  - [ ] `removeEntityFromContainer(entity)` - удалить из контейнера (скрыть детали removeChild)
  - [ ] `addToStage(container)` - добавить контейнер на stage (скрыть детали addChild)
  - [ ] `removeFromStage(container)` - удалить контейнер со stage (скрыть детали removeChild)

- [ ] **Рефакторить `SelectionIndicator`** для использования нового API:
  - [ ] Заменить `entity.container.addChild()` на `rendererSystem.addEntityToContainer()`
  - [ ] Заменить `entity.container.removeChild()` на `rendererSystem.removeEntityFromContainer()`
  - [ ] Убрать зависимость от `entity.container` напрямую

- [ ] **Рефакторить `EntitySpawnSystem`** для использования `RendererSystem`:
  - [ ] Передать `RendererSystem` в конструктор вместо прямой работы с `app.stage`
  - [ ] Использовать `rendererSystem.addToStage()` вместо `app.stage.addChild()`
  - [ ] Использовать `rendererSystem.removeFromStage()` вместо `app.stage.removeChild()`

#### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами (например, через интерфейсы)
- [ ] Добавить JSDoc документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему `SelectionRenderingSystem`

## 📝 История изменений

### 2026-02-12 - Проверка актуальности TODO.md
- ✅ Выявлены АКТУАЛЬНЫЕ проблемы:
  - `SelectionIndicator` работает напрямую с `entity.container` (lines 30, 36, 43)
  - `EntitySpawnSystem` работает напрямую с `app.stage` (lines 85, 90, 133, 139)
- 🆕 Обновлены задачи Приоритета 2 для добавления API в `RendererSystem`
- 🆕 Добавлена задача по рефакторингу `EntitySpawnSystem` для использования `RendererSystem`

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
- **Системы**: Все системы используют `gameEngine.state` как EventBus для взаимодействия
