# Todo List - Frontend Improvements

## 🟡 Архитектурные проблемы (требуют внимания)

### 1. **StateContainer не является истинным источником истины**
- ❌ Системы (`RendererSystem`, `EntitySpawnSystem`) работают напрямую с `entity.container`
- ❌ `SelectionIndicator` работает напрямую с `entity.container` для добавления/удаления индикаторов
- ✅ Системы взаимодействуют через `gameEngine.state` (EventEmitter паттерн)
- **СТАТУС**: Требует архитектурной переработки - методы работы с контейнерами должны быть инкапсулированы в `RendererSystem`

### 2. **Непоследовательный обмен данными**
- ⚠️ Системы получают `gameEngine` в конструкторе (паттерн архитектуры)
- ✅ Взаимодействие через `gameEngine.state` (EventEmitter) для событий ✅
- ❌ Нет стандартного API для прямого взаимодействия систем друг с другом
- **СТАТУС**: Архитектура использует StateContainer как EventBus, прямые зависимости через gameEngine

## 🟡 Архитектурные проблемы (требуют внимания)

### 7. **Дублирование _renderedEntities и state.entities** ✅ ИСПРАВЛЕНО
- ✅ Удалено дублирование: `_renderedEntities` больше не используется
- ✅ `RendererSystem.getEntity()` читает из `state.entities`
- ✅ `RendererSystem.updateEntityPosition()` работает с state
- ✅ Удален лишний цикл очистки в `destroy()`

### 8. **Fallback логика в _syncEntities** ✅ ИСПРАВЛЕНО
- ✅ Удалена fallback логика без entitySpawnSystem
- ✅ `_syncEntities()` логирует ошибку если нет entitySpawnSystem

### 9. **SelectionIndicator прямой доступ к Pixi контейнерам** ❌ АКТУАЛЬНАЯ ПРОБЛЕМА
- ✅ `SelectionIndicator` читает данные из `state.entities`
- ❌ `SelectionIndicator` работает напрямую с `entity.container` (addChild, removeChild)
- ❌ Прямой доступ к `entity.container` в методах:
  - `createSelectionIndicator()` (строка 30)
  - `removeSelectionIndicator()` (строка 36)
  - `removeInfoIndicator()` (строка 43)
- ❌ `RendererSystem` не предоставляет API для инкапсуляции работы с контейнерами
- **СТАТУС**: Требует инкапсуляции через `RendererSystem.getEntityContainer(id)`

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
  - Инкапсулировать работу с `entity.container` в `RendererSystem`
  - `SelectionIndicator` должен получать контейнеры через `RendererSystem.getEntityContainer(id)`
  - Убрать прямой доступ к `entity.container` из `EntitySpawnSystem`, `RendererSystem`, `SelectionIndicator`
  
- [ ] **Единый API для взаимодействия систем**
  - Стандартизировать методы доступа к сущностям между системами
  - Рассмотреть внедрение `RendererSystem` в другие системы вместо прямой зависимости от `gameEngine`

#### Приоритет 2 (важно) - Рефакторинг

- [ ] **Добавить инкапсулирующий API в `RendererSystem`**:
  - [ ] `getEntityContainer(id)` - получить контейнер сущности
  - [ ] `getEntityGraphics(id)` - получить graphics сущности
  - [ ] `getEntityCoordinates(id)` - получить gameX/gameY сущности
  - [ ] `addEntityToContainer(entity, container)` - добавить в контейнер (скрыть детали addChild)
  - [ ] `removeEntityFromContainer(entity)` - удалить из контейнера (скрыть детали removeChild)

- [ ] **Рефакторить `SelectionIndicator`** для использования нового API:
  - [ ] Заменить `entity.container.addChild()` на `rendererSystem.addEntityToContainer()`
  - [ ] Заменить `entity.container.removeChild()` на `rendererSystem.removeEntityFromContainer()`
  - [ ] Убрать зависимость от `entity.container` напрямую

#### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами (например, через интерфейсы)
- [ ] Добавить JSDoc документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему `SelectionRenderingSystem`

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
- **Системы**: Все системы используют `gameEngine.state` как EventBus для взаимодействия

### 2026-02-12 - Текущее состояние архитектуры
- **StateContainer**: Работает как центральный источник состояния и EventBus
- **RendererSystem**: Хранит `entity.container` и `entity.graphics`, доступ через `state.entities`
- **SelectionIndicator**: Читает данные из `state.entities`, но работает напрямую с `entity.container`
- **EntitySpawnSystem**: Работает напрямую с `entity.container` для добавления/удаления из stage
- **Проблема**: Отсутствует инкапсуляция доступа к Pixi контейнерам (нужен `RendererSystem.getEntityContainer(id)`)

### 2026-02-12 - Обновление TODO.md
- ✅ Приоритет 1 задачи выполнены (CoordinateTransformer интегрирован)
- ✅ Приоритет 2: Задачи `_renderedEntities` и fallback логика выполнены
- ⚠️ Приоритет 1: Остались архитектурные проблемы с `StateContainer` и API
- ⚠️ Приоритет 1: SelectionIndicator требует инкапсуляции работы с entity.container через RendererSystem
- ✅ Системы используют gameEngine.state как EventBus для взаимодействия

### 2026-02-12 - Проверка актуальности TODO.md
- ❌ TODO.md требует обновления - осталась АКТУАЛЬНАЯ проблема в SelectionIndicator
- ✅ SelectionIndicator работает напрямую с `entity.container` (lines 30, 36, 43)
- ❌ `RendererSystem` не предоставляет API для инкапсуляции работы с контейнерами
- ⚠️ Задача из TODO.md про "ЧАСТИЧНО ИСПРАВЛЕНО" для SelectionIndicator больше не актуальна - проблема ВСЕ ЕСТЬ
- 🆕 Добавлены новые задачи в Приоритет 2 для добавления инкапсулирующего API в `RendererSystem`
