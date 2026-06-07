# 🍔 Food Order Tracker

A full-stack real-time food order tracking application built with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js).

---

## 📌 Features

- 📦 **Real-time Order Lifecycle** — Orders automatically transition from `Preparing` → `Out for Delivery` → `Delivered` using JavaScript timers
- 🛠️ **Admin Dashboard** — View total order counts, live status tracking (Pending vs Delivered)
- 🧾 **Customer Interface** — Intuitive UI to place and track food orders
- 📡 **REST API Backend** — Express.js API connected to MongoDB for data persistence
- 📱 **Responsive Design** — Works across desktop and mobile

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React.js, JavaScript (ES6+), CSS3 |
| Backend    | Node.js, Express.js               |
| Database   | MongoDB                           |
| API        | REST API                          |
| Tools      | Git, GitHub, VS Code              |

---

## 📁 Project Structure

This project is split into two repositories:

- **Frontend** → [`Food-order-tracking`](https://github.com/chaitradhake/Food-order-tracking)
- **Backend** → [`Food-order-tracking-backend`](https://github.com/chaitradhake/Food-order-tracking-backend)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js installed
- MongoDB running locally or MongoDB Atlas URI

### 1. Clone the repositories

```bash
# Frontend
git clone https://github.com/chaitradhake/Food-order-tracking.git

# Backend
git clone https://github.com/chaitradhake/Food-order-tracking-backend.git
```

### 2. Install dependencies

```bash
# In frontend folder
cd Food-order-tracking
npm install

# In backend folder
cd Food-order-tracking-backend
npm install
```

### 3. Set up environment variables

Create a `.env` file in the backend folder:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

### 4. Run the app

```bash
# Start backend
cd Food-order-tracking-backend
npm start

# Start frontend (in a new terminal)
cd Food-order-tracking
npm start
```

App runs at `http://localhost:3000`


---

## 👩‍💻 Author

**Chaitra Dhake**
- Portfolio: [portfolio-chaitradhake.vercel.app](https://portfolio-chaitradhake.vercel.app)
- LinkedIn: [linkedin.com/in/chaitradhake](https://linkedin.com/in/chaitradhake)
- GitHub: [github.com/chaitradhake](https://github.com/chaitradhake)
