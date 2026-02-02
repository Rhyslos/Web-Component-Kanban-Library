# Kanban Board API Documentation

**Base URL:** `/api`  
**Content-Type:** `application/json`

---

## 1. Board State

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| **GET** | `/board` | Fetch full application state (columns, swimlanes, tasks, users). | `{ columns: [], swimlanes: [], tasks: [], users: [] }` |

## 2. Structure (Grid)

| Method | Endpoint | Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/columns` | `{ "title": "Todo" }` | Creates a new vertical list column. |
| **POST** | `/swimlanes` | `{ "title": "Dev" }` | Creates a new horizontal swimlane row. |

## 3. User Management

| Method | Endpoint | Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/users` | `{ "username": "Alice" }` | Registers a new user. Returns `400` if username exists. |
| **DELETE** | `/users/:username` | N/A | **Hard Delete:** Permanently deletes the user AND all tasks owned by them. |

## 4. Tasks

| Method | Endpoint | Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/tasks` | `{ "columnId": 1, "swimlaneId": 1, "taskText": "Bug fix", "owner": "Alice" }` | Creates a task. `owner` defaults to "Guest" if omitted. |
| **PUT** | `/tasks/:id` | `{ "newColumnId": 2, "newSwimlaneId": 1 }` | Moves a task to a new grid coordinate. |

---

## Data Models

### User Object
```json
{
  "id": 1741234567890,
  "username": "Alice"
}

{
  "id": 1741234567891,
  "columnId": 101,
  "swimlaneId": 1,
  "text": "Fix bug",
  "owner": "Alice"
}