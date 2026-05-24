# Chat Application API Documentation

## Base URL
```
http://localhost:3010/api
```

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ecb54b24a123456789ab",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### 2. Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d5ecb54b24a123456789ab",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### 3. Logout User
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### 4. Get User Profile
**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "60d5ecb54b24a123456789ab",
    "username": "john_doe",
    "email": "john@example.com",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Chat Endpoints

### 1. Send Message
**POST** `/chat/send`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is artificial intelligence?"
}
```

**Response:**
```json
{
  "message": "Artificial intelligence (AI) is...",
  "chatId": "60d5ecb54b24a123456789ac",
  "tokens": 150
}
```

### 2. Get Chat History
**GET** `/chat/history?limit=50&skip=0`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of chats to retrieve (default: 50)
- `skip` (optional): Number of chats to skip (default: 0)

**Response:**
```json
{
  "chats": [
    {
      "_id": "60d5ecb54b24a123456789ac",
      "userId": "60d5ecb54b24a123456789ab",
      "message": "What is AI?",
      "response": "AI is...",
      "timestamp": "2024-01-15T10:35:00.000Z",
      "metadata": {
        "model": "gpt-3.5-turbo",
        "tokens": 150
      }
    }
  ],
  "total": 10,
  "limit": 50,
  "skip": 0
}
```

### 3. Delete Single Chat
**DELETE** `/chat/:chatId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Chat deleted successfully"
}
```

### 4. Clear All Chat History
**DELETE** `/chat`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Chat history cleared successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "error": "No authentication token provided"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Server error message"
}
```

## Getting Started

1. Start the server:
```bash
npm start
```

2. Register a new user using the `/auth/register` endpoint

3. Save the returned JWT token

4. Use the token in the `Authorization` header for all protected endpoints:
```
Authorization: Bearer <your-token-here>
```

5. Start sending chat messages using the `/chat/send` endpoint

## Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","email":"john@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

**Send Chat Message:**
```bash
curl -X POST http://localhost:3010/api/chat/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"message":"Hello, how are you?"}'
```

**Get Chat History:**
```bash
curl -X GET http://localhost:3010/api/chat/history \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
