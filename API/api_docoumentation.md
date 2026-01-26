# Kanban Board API Documentation

**Base URL:** `/api`  
**Content-Type:** `application/json`  
**Success Response:** `200 OK` or `201 Created`  
**Error Response:** `400 Bad Request` or `500 Internal Server Error`

---

## 1. Board State

The primary endpoint to hydrate the entire application on initial load.

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| **GET** | `/board` | Retrieves the complete 2D matrix, including all active columns, swimlanes, and tasks. | `{ columns: [], swimlanes: [], tasks: [] }` |

---

## 2. Columns (Lists)

Manage the vertical lists that contain task cards.

| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/columns` | `{ "title": "New List" }` | Creates a new column at the end of the X-axis. Defaults to a grey color. |
| **PUT** | `/columns/:id` | `{ "title": "Dev", "color": "#0079bf" }` | Updates the column's display title or hex color. Both fields are optional. |

---

## 3. Swimlanes (Rows)

Manage the horizontal rows that create the 2D grid structure.

| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/swimlanes` | `{ "title": "Main Lane" }` | Creates a new swimlane at the bottom of the Y-axis. |

---

## 4. Tasks (Cards)

Manage the individual cards. Tasks are linked to both a Column ID and Swimlane ID to determine their exact grid position.

| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/tasks` | `{ "colId": 1, "swimId": 1, "text": "New task" }` | Creates a new task in the specified grid coordinate. |
| **PUT** | `/tasks/:id` | `{ "colId": 2, "swimId": 1 }` | Moves a task to a new coordinate (Used by Drag & Drop). |
| **PUT** | `/tasks/:id` | `{ "text": "Updated title", "category": "URGENT" }` | Updates task content or its banner category. Fields are optional. |

---

## Data Model

This is the complete JSON structure of the application, returned by the `GET /board` endpoint.

```json
{
  "columns": [
    {
      "id": 101,
      "title": "To Do",
      "color": "#0079bf" // Applied to the banner of child tasks
    }
  ],
  "swimlanes": [
    {
      "id": 1,
      "title": "Main Lane" 
    }
  ],
  "tasks": [
    {
      "id": 201,
      "colId": 101, // Links to Column ID (X-axis)
      "swimId": 1,  // Links to Swimlane ID (Y-axis)
      "text": "Write API Docs",
      "category": "DOCUMENTATION" // Renders in the top 25% card banner
    }
  ]
}