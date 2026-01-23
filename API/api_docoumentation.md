# Custom Middleware: Input Validation

## 1. The Need
In a standard Express API, the server blindly trusts incoming data. This creates two problems:
1. **Data Integrity:** A user could accidentally create an empty task, cluttering the database.
2. **Security Vulnerability:** A malicious user could send a Cross-Site Scripting (XSS) attack by injecting JavaScript (e.g., `<script>alert('hack')</script>`) into the Kanban board, which would execute in other users' browsers.

To solve this, I created a custom middleware function to act as a "Bouncer" for the API.

## 2. Functionality
The `validateInput` middleware intercepts all `POST` (Create) and `PUT` (Update) requests before they reach the database routing logic. It performs two checks:
* **Validation Check:** Ensures `req.body.title` and `req.body.taskText` are not empty strings.
* **Sanitization Check:** Uses Regular Expressions (Regex) to scan the input for dangerous HTML characters (`<` or `>`).

## 3. Implementation Details
The middleware utilizes the standard Express request-response cycle. 
* If the data is **invalid**, the middleware terminates the cycle immediately and returns a `400 Bad Request` status with a JSON error message.
* If the data is **valid**, the middleware calls the `next()` function, passing control to the appropriate API endpoint.

**Code Example:**
\`\`\`javascript
// middleware.mjs
export const validateInput = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const { title, taskText } = req.body;
        const dangerousChars = /[<>]/;

        // Block empty strings or HTML tags
        if (title?.trim() === "" || dangerousChars.test(title)) {
            return res.status(400).json({ error: "Invalid input." });
        }
    }
    next(); // Pass control to the router
};
\`\`\`