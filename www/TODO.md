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

### 12. **Fallback логика с прямым app.stage access в EntitySpawnSystem и RendererSystem** ⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЯ (2026-02-12)
- **EntitySpawnSystem.js:83, 120** - fallback ветки с прямым `app.stage.addChild()` и `removeChild()`
- **RendererSystem.js:245, 357** - прямой `this.app.stage.addChild()` и `addChildAt()` в `createEntitySprite()` и `setupGrid()`
- **СТАТУС**: КРИТИЧНО - нарушает инкапсуляцию, должно использовать только `RendererSystem.addToStage()`/`removeFromStage()`

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

## 🔴 НЕОБХОДИМЫЕ ИСПРАВЛЕНИЯ (обновлено 2026-02-12)

#### 12. **Остались fallback-ветки с прямым доступом к app.stage** ⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЯ
- **RendererSystem.js:245** - `this.app.stage.addChild(container)` в `createEntitySprite()`
- **RendererSystem.js:357** - `this.app.stage.addChildAt()` в `setupGrid()`
- **EntitySpawnSystem.js:83** - fallback `app.stage.addChild(container)`
- **EntitySpawnSystem.js:120** - fallback `gameEngine.app.stage.removeChild()`

**Последствия**: Нарушает инкапсуляцию, создает потенциальные баги при смешанном использовании API

**Решение**: Удалить все fallback-ветки - довериться `RendererSystem.addToStage()`/`removeFromStage()`

## 📋 История изменений

### 2026-02-12 - Исправление критичных fallback-веток
- **EntitySpawnSystem**: Удалены fallback-ветки с прямым доступом к `app.stage` (lines 83, 120)
- **RendererSystem**: Удалены fallback-ветки с прямым `this.app.stage.addChild()` и `addChildAt()` (lines 245, 357)
- **Все системы**: Теперь используют только `RendererSystem.addToStage()` и `removeFromStage()`
- **Tests**: Обновлены тесты для корректной инициализации `rendererSystem` через `init(app)`
