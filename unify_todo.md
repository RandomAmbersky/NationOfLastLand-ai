# Предложения по унификации кода в папке www

## Найденные проблемы дублирования логики

### 1. Дублирование логики определения `isEnemy`
Повторяется в 3 местах определение враждебности сущности:
```javascript
const isEnemy = entity.faction === 'Enemy' || entity.faction === 'Wild' || entity.entityType === 'alert';
```

**Где повторяется:**
- `www/game-demo.js:325`
- `www/selection-manager.js:108`
- `www/selection-manager.js:125`

**Предложение:** Создать утилитарный метод `isEnemy(entity)` в классе `GameDemo`

### 2. Дублирование логики создания индикаторов информации
Повторяется создание PIXI.Graphics с одинаковыми параметрами:
```javascript
const graphics = new PIXI.Graphics();
graphics.lineStyle(3, 0x0080FF, 1);
graphics.drawCircle(0, 0, 12);
```

**Где повторяется:**
- `www/game-demo.js:647`
- `www/game-demo.js:651`
- `www/selection-manager.js:219`

**Предложение:** Создать утилитарный метод `createInfoIndicator()` в классе `EntityRenderer`

### 3. Дублирование логики фильтрации `playerMovableUnits`
Повторяется фильтрация сущностей игрока:
```javascript
entity.faction === 'Player' && entity.entityType === 'vehicle'
```

**Где повторяется:**
- `www/selection-manager.js:189`
- `www/selection-manager.js:268`

**Предложение:** Создать утилитарный метод `isPlayerVehicle(entity)` в классе `GameDemo`

### 4. Дублирование логики обработки `handle_entity_selection`
Повторяется цикл с `handle_entity_selection(entityId, true, currentSelectedIds)`:

**Где повторяется:**
- `www/selection-manager.js:194-210` (метод `_processRectangleSelection`)
- `www/selection-manager.js:273-289` (метод `selectAllPlayerUnits`)

**Предложение:** Создать общий метод `selectEntities(entities, isMultiSelect)` в классе `SelectionManager`

### 5. Дублирование вызовов `clearAllSelections(true)`
Повторяется в 4 местах вызов очистки выделения с параметром `true`

**Где повторяется:**
- `www/selection-manager.js:183`
- `www/selection-manager.js:265`
- `www/selection-manager.js:295`
- `www/selection-manager.js:305`

**Предложение:** Возможно, это нормально для разных контекстов использования

### 6. Дублирование создания индикаторов с `lineStyle(3, color, 1)`
Повторяется в 3 местах создание индикаторов с одинаковым стилем

**Где повторяется:**
- `www/selection-manager.js:219`
- `www/entity-renderer.js:95`
- `www/entity-renderer.js:103`

**Предложение:** Создать константу или метод для стандартного стиля индикаторов

## План унификации

### Шаг 1: Создать утилитарные методы в GameDemo
```javascript
// Добавить в класс GameDemo
isEnemy(entity) {
    return entity.faction === 'Enemy' || entity.faction === 'Wild' || entity.entityType === 'alert';
}

isPlayerVehicle(entity) {
    return entity.faction === 'Player' && entity.entityType === 'vehicle';
}
```

### Шаг 2: Создать утилитарные методы в EntityRenderer
```javascript
// Добавить в класс EntityRenderer
createInfoIndicator() {
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(3, 0x0080FF, 1);
    graphics.drawCircle(0, 0, 12);
    return graphics;
}
```

### Шаг 3: Создать общий метод в SelectionManager
```javascript
// Добавить в класс SelectionManager
async selectEntities(entities, isMultiSelect = true) {
    // Общая логика для выбора группы сущностей
    // Заменяет дублированный код в _processRectangleSelection и selectAllPlayerUnits
}
```

### Шаг 4: Заменить все места использования
- Заменить прямые определения `isEnemy` на вызов метода
- Заменить создание индикаторов на вызов `createInfoIndicator()`
- Заменить фильтрацию на `isPlayerVehicle()`
- Рефакторить методы выбора сущностей для использования общего кода

### Шаг 5: Очистить код
- Убрать закомментированные вызовы `updateSelectedEntityInfo()` если они не нужны
- Убедиться, что все изменения не ломают функциональность

## Преимущества унификации
- Уменьшение дублированного кода
- Централизованная логика для изменений
- Лучшая поддерживаемость
- Снижение вероятности ошибок при изменениях
