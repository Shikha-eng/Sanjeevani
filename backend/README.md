# Sanjeevani Backend API

Backend server for the Sanjeevani Medical Platform.

## Features

- User Authentication (Login/Signup) for Doctors and Patients
- JWT-based authorization
- Role-based access control
- MongoDB database with Mongoose
- TypeScript support
- Input validation
- Security middleware (Helmet, CORS)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```
   Then update the variables in `.env` file.

3. **Start MongoDB:**
   Make sure MongoDB is running on your system.

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## API Endpoints

### Authentication

#### Signup
- **POST** `/api/auth/signup`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "doctor|patient",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    
    // For doctors:
    "specialization": "Cardiology",
    "licenseNumber": "MED12345",
    "experience": 5,
    "consultationFee": 500,
    
    // For patients:
    "bloodGroup": "O+",
    "allergies": ["Penicillin"],
    "medicalHistory": "..."
  }
  ```

#### Login
- **POST** `/api/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Get Current User
- **GET** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`

#### Update Profile
- **PUT** `/api/auth/update-profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** Fields to update

#### Change Password
- **PUT** `/api/auth/change-password`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
  }
  ```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts       # Database connection
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── validate.ts       # Validation middleware
│   ├── models/
│   │   └── User.ts           # User model
│   ├── routes/
│   │   └── auth.ts           # Authentication routes
│   ├── utils/
│   │   └── auth.ts           # JWT utilities
│   └── server.ts             # Main server file
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT
- `JWT_EXPIRE` - JWT expiration time
- `FRONTEND_URL` - Frontend URL for CORS

## Technologies

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT for authentication
- bcryptjs for password hashing
- express-validator for input validation
- helmet for security
- CORS support
