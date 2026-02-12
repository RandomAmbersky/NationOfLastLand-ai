# Todo List - Frontend Improvements

## 🟡 Оставшиеся архитектурные проблемы

### 1. **StateContainer не является истинным источником истины для контейнеров**
- ✅ Инкапсулирующий API добавлен в `RendererSystem` (getEntityContainer, addEntityToContainer, и др.)
- ✅ `SelectionIndicator` и `EntitySpawnSystem` теперь используют `RendererSystem` API
- ⚠️ Прямой доступ к `entity.container` еще присутствует в некоторых местах
- ✅ Системы взаимодействуют через `gameEngine.state` (EventEmitter паттерн)
- **СТАТУС**: Частично решено - API инкапсуляции добавлен, но некоторые места требуют дальнейшего рефакторинга

### 2. **Непоследовательный обмен данными**
- ⚠️ Системы получают `gameEngine` в конструкторе (паттерн архитектуры)
- ✅ Взаимодействие через `gameEngine.state` (EventEmitter) для событий
- ⚠️ Нет строгого интерфейса для прямого взаимодействия систем друг с другом
- ✅ `RendererSystem` устанавливается в `gameEngine.rendererSystem` для легкого доступа
- **СТАТУС**: Архитектура использует StateContainer как EventBus, прямые зависимости через gameEngine

## ✅ Завершенные задачи

### 6. **Инкапсуляция работы с Pixi контейнерами в RendererSystem** ✅ ЗАВЕРШЕНО (2026-02-12)
- ✅ Добавлен инкапсулирующий API в `RendererSystem`:
  - `getEntityContainer(id)` - получить контейнер сущности
  - `getEntityGraphics(id)` - получить graphics сущности  
  - `getEntityCoordinates(id)` - получить gameX/gameY сущности
  - `addEntityToContainer(entity, container)` - добавить в контейнер (скрыть addChild)
  - `removeEntityFromContainer(entity)` - удалить из контейнера (скрыть removeChild)
  - `addToStage(container)` - добавить контейнер на stage (скрыть addChild)
  - `removeFromStage(container)` - удалить контейнер со stage (скрыть removeChild)
- ✅ `SelectionIndicator` рефакторится для использования нового API
- ✅ `EntitySpawnSystem` рефакторится для использования `RendererSystem` API
- ✅ Все системы могут получать `rendererSystem` из `gameEngine.rendererSystem`

### 7. **Удаление дублирования _renderedEntities** ✅ ИСПРАВЛЕНО (2026-02-12)
- ✅ `RendererSystem.getEntity()` читает из `state.entities`
- ✅ `RendererSystem.updateEntityPosition()` работает с state
- ✅ Удален лишний цикл очистки в `destroy()`

### 8. **Fallback логика в _syncEntities** ✅ ИСПРАВЛЕНО (2026-02-12)
- ✅ Удалена fallback логика без entitySpawnSystem
- ✅ `_syncEntities()` логирует ошибку если нет entitySpawnSystem

### 9. **Интеграция CoordinateTransformer** ✅ ЗАВЕРШЕНО (2026-02-12)
- ✅ `CoordinateTransformer` внедрен во все системы
- ✅ Удалена дублирующая логика трансформации из всех систем
- ✅ Добавлены `init(app)` и улучшенные `destroy()` методы

## 📝 Актуальные задачи (обновлено 2026-02-12)

### ✅ Приоритет 2 - Рефакторинг (ВЫПОЛНЕНО)

#### 10. **Удалить прямой доступ к entity.container из SelectionIndicator** ✅ ЗАВЕРШЕНО (2026-02-12)
- ✅ `SelectionIndicator.js`: Удалены fallback ветки с прямым доступом к `entity.container`
- ✅ Теперь используется только `RendererSystem.addEntityToContainer()` и `removeEntityFromContainer()`
- ✅ Все тесты проходят (151/151)

#### 11. **Проверить и зафиксить remaining direct app.stage access** ✅ ВЕРIFIЦИРОВАНО (2026-02-12)
- ✅ `EntitySpawnSystem`: Использует `RendererSystem.addToStage()` и `removeFromStage()`
- ✅ `RendererSystem`: Использует `app.stage` только внутри инкапсулированных методов

### ⚠️ Приоритет 3 - Документация и улучшения

## 📋 История изменений

### 2026-02-12 - Рефакторинг SelectionIndicator ✅
- **SelectionIndicator.js**: Удалены fallback ветки с прямым доступом к `entity.container`
- **SelectionIndicator**: Теперь использует только `RendererSystem` API
- **Tests**: Все 151 тестов проходят успешно

### 2026-02-12 - Проверка актуальности TODO.md
- ✅ Выявлены АКТУАЛЬНЫЕ проблемы:
  - `SelectionIndicator` работает напрямую с `entity.container` (lines 30, 36, 43)
  - `EntitySpawnSystem` работает напрямую с `app.stage` (lines 85, 90, 133, 139)
- 🆕 Обновлены задачи Приоритета 2 для добавления API в `RendererSystem`
- 🆕 Добавлена задача по рефакторингу `EntitySpawnSystem` для использования `RendererSystem`

### 2026-02-12 - Инкапсуляция работы с контейнерами в RendererSystem ✅
- **RendererSystem**: Добавлен инкапсулирующий API (7 методов) для работы с контейнерами
- **EntitySpawnSystem**: Обновлен для получения `rendererSystem` через конструктор/`gameEngine`
- **SelectionIndicator**: Обновлен для получения `rendererSystem` и использования API контейнеров
- **SelectionSystem**: Обновлен для передачи `rendererSystem` в `SelectionIndicator`
- **GameEngine**: При инициализации `RendererSystem` устанавливает `gameEngine.rendererSystem`
- **Tests**: Обновлены тесты для работы с новым API

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
