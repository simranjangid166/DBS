# Library Management System — ReactJS + Spring Boot + MySQL Workbench + Postman

## Technology stack

Frontend:
- ReactJS
- Vite
- JavaScript

Backend:
- Spring Boot 3
- Spring Security
- JWT
- BCrypt
- Spring Data JPA
- Bean Validation
- @Async background logging

Database:
- MySQL 8
- MySQL Workbench

API testing:
- Postman

## Architecture

ReactJS
   |
   | REST / JSON / JWT
   v
Spring Boot REST API
   |
   +-- Validation
   +-- JWT Security
   +-- BCrypt
   +-- JPA / Hibernate
   +-- @Async Audit Task
   +-- Semantic Search Service
   |
   v
MySQL 8
   ^
   |
MySQL Workbench

## 1. MySQL Workbench setup

Open MySQL Workbench and connect to your local MySQL Server.

Run:

```sql
CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;
```

The same SQL is available in:

`database/library_database.sql`

Spring Boot creates the `members` and `books` tables with Hibernate.

Default configuration:

```text
Host: localhost
Port: 3306
Database: library_db
Username: root
Password: root
```

Change these in `application.properties` or environment variables if your MySQL password differs.

## 2. Start Spring Boot

Requirements:
- Java 17+
- Maven
- MySQL 8+

```bash
cd backend
mvn spring-boot:run
```

API:

```text
http://localhost:8080
```

## 3. Start ReactJS

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## 4. Test completely using Postman

Import:

`postman/Library_API.postman_collection.json`

Run requests in this order:

### A. Health

```text
GET http://localhost:8080/api/health
```

Expected:

```json
{
  "status": "ok"
}
```

### B. Register

```text
POST http://localhost:8080/api/auth/register
```

Body:

```json
{
  "username": "member01",
  "email": "member01@example.com",
  "password": "StrongPass123"
}
```

### C. Login

```text
POST http://localhost:8080/api/auth/login
```

Body:

```json
{
  "username": "member01",
  "password": "StrongPass123"
}
```

The Postman collection automatically saves `accessToken` as the `token` collection variable.

### D. Add Book

```text
POST http://localhost:8080/api/books
Authorization: Bearer {{token}}
```

Body:

```json
{
  "title": "ReactJS and Spring Boot Development",
  "isbn": "9781234567890",
  "price": 799.00,
  "publishedDate": "2026-01-15",
  "description": "A practical guide to building secure web applications using ReactJS and Spring Boot."
}
```

### E. Semantic Search

```text
GET http://localhost:8080/api/books/search?q=secure%20web%20development&limit=10
Authorization: Bearer {{token}}
```

## 5. Validation tests in Postman

Try invalid ISBN:

```json
{
  "title": "Test Book",
  "isbn": "12345",
  "price": 100,
  "publishedDate": "2026-01-01"
}
```

Expected: HTTP 400 validation error.

Try invalid price:

```json
{
  "title": "Test Book",
  "isbn": "9781234567890",
  "price": 0,
  "publishedDate": "2026-01-01"
}
```

Expected: HTTP 400.

Try future date:

```json
{
  "title": "Test Book",
  "isbn": "9781234567890",
  "price": 100,
  "publishedDate": "2099-01-01"
}
```

Expected: HTTP 400.

## 6. Semantic search and MySQL

This MySQL version intentionally does NOT use PostgreSQL's `pgvector` or the PostgreSQL `<=>` operator.

Instead:
1. Book text is converted into an embedding.
2. The embedding is stored in MySQL as JSON text.
3. The query is converted into an embedding.
4. Spring Boot calculates cosine similarity.
5. Books are sorted by similarity.

This makes the project directly compatible with MySQL Workbench.

If your institution specifically requires native database-side vector search, use a MySQL version/service that supports the required vector features and change the schema/query accordingly.

## 7. Background task

After a successful book insertion, Spring Boot calls:

```java
@Async
public void logNewBook(...)
```

The event is written to:

```text
backend/logs/book_events.txt
```

## 8. Security flow

```text
ReactJS / Postman
       |
       | username + password
       v
Spring Boot
       |
       | BCrypt verification
       v
     MySQL
       |
       v
     JWT
       |
       v
Authorization: Bearer <token>
       |
       v
Member-only Book APIs
```

## 9. VS Code workflow

Open the entire `library_react_springboot_mysql` folder in VS Code.

Use two terminals:

Terminal 1:

```bash
cd backend
mvn spring-boot:run
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

Use MySQL Workbench to inspect:

```text
library_db
  ├── members
  └── books
```

Use Postman to test every API endpoint.

## Production recommendations

For a production textbook implementation, add:
- Flyway/Liquibase migrations
- refresh-token rotation
- role-based access control
- HTTPS
- rate limiting
- secure HttpOnly cookies where appropriate
- centralized structured logging
- database indexes
- a production embedding/vector-search service
- automated integration tests
