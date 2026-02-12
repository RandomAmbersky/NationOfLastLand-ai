# Todo List - Frontend Improvements

## ✅已完成

1. **Смешение ответственности** - **ВЫПОЛНЕНО**
   - ✅ `RendererSystem` делегирует создание сущностей `EntitySpawnSystem`
   - ✅ `EntityService` is no longer used by systems (removed from RendererSystem)
   - `GameStateSystem` управляет состоянием и WASM (intentional - it's the game state bridge)

## 🟡 Архитектурные проблемы

2. **StateContainer не является истинным источником истины**
   - ❌ `RendererSystem._renderedEntities` хранит дублирующую информацию
   - ❌ `SelectionIndicator` работает напрямую с Pixi контейнерами
   - **СТАТУС**: Требует архитектурной переработки

3. **Отсутствие централизованного CoordinateService**
   - ⚠️ `CoordinateTransformer` существует и экспортируется
   - ❌ `RendererSystem`, `InputSystem`, `SelectionSystem` дублируют логику трансформации координат
   - **СТАТУС**: Требует архитектурной переработки

4. **Непоследовательный обмен данными**
   - ⚠️ Системы получают `gameEngine` в конструкторе
   - ❌ Нет явного API для взаимодействия между системами
   - **СТАТУС**: Требует архитектурной переработки

## ✅ Исправленные проблемы

5. **Ошибки в `_syncEntities`** - **ИСПРАВЛЕНО**
   - ✅ Добавлено логирование в `_syncEntities` (lines 356-365)
   - `RendererSystem` now uses `EntitySpawnSystem.processSpawns()` and `processDeletions()`

6. **Утечки памяти** - **ПРОВЕРЕНО**
   - ✅ `destroy()` methods properly clean up containers and references

## 🟢 Рекомендации по улучшению

### Приоритет 2 (важно)

- [x] Вынести логику создания/удаления сущностей в отдельный `EntitySpawnSystem` - **ВЫПОЛНЕНО**

### Приоритет 3 (желательно)

- [ ] Стандартизировать API между системами
- [ ] Создать централизованный `CoordinateService` (использовать `CoordinateTransformer`)
- [ ] Устранить дублирование `_renderedEntities` в `RendererSystem`
- [ ] Добавить документацию к каждой системе
- [ ] Рассмотреть рефакторинг `SelectionIndicator` в отдельную систему
