# ♟️ Backend – Chess Online API

This repository contains the backend of the online chess project, developed using **Node.js**, **Express**, and **WebSockets** via **socket.io**.

---

## 📁 Project Structure

```text
backend/
├── app.js                         # Sets up middlewares and defines main HTTP routes
├── server.js                      # Starts the server and manages socket connections
├── package.json                   # Project dependencies
├── .env                           # Environment variables
├── LICENSE                        # Project license
└── src/
    ├── login/                     # User authentication and management
    ├── db/db_requests.js/         # Database queries
    ├── rooms/                     # Real-time game logic
    ├── chat/                      # User chat
    ├── friendship/                # Friends and challenge system
    └── cronjobs/                  # Scheduled tasks
```


---

## ✍️ Code Conventions

- Uses modern JavaScript (ES6+).
- Project is modularized into subdirectories by functionality (`login/`, `chat/`, `rooms/`, etc.).
- Follows a flexible MVC pattern.
- File, function, and variable names are in **English** for consistency.
- Comments and documentation are written in **Spanish**.

---

## 📦 Dependencies

Main dependencies include:

- `express` – HTTP framework  
- `socket.io` – Real-time communication using WebSockets  
- `cors`, `dotenv`, `node-schedule` – Middleware, configuration, and scheduled tasks

Install dependencies with:

```bash

npm install

```

## ▶️ How to Run the Server

Make sure you have Node.js installed.

Clone the repository and navigate to the backend/ directory.

Create and configure your .env file (see next section).

Start the server with:

```bash

node server.js

```

## ⚙️ Environment Configuration
This backend depends on a .env file to define variables such as the server port and database connection.

Note: The .env file is not included for security reasons. Please request it from the team if needed.

## 🔌 WebSockets
The backend supports real-time communication with socket.io. Features include:

Searching or creating live games

Making moves and resigning

Requesting or accepting draws

Handling disconnections

In-game chat between users

Challenges between friends

## ⏰ Cron Jobs
Automated tasks are handled using node-schedule, such as:

Deleting inactive guest users

## 📝 License
This project is licensed under the terms specified in the LICENSE file.
