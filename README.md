# 🌶️ Idukki Origins

Idukki Origins is a premium, deployment-ready full-stack e-commerce application built to deliver a seamless shopping experience for high-quality spices.

## 🚀 Features

- **Dynamic Product Catalog**: Fetch and display products directly from a cloud PostgreSQL database.
- **Global Shopping Cart**: Add, remove, and manage cart item quantities with instant state updates.
- **Custom Authentication**: Secure user registration and login using encrypted passwords (`bcryptjs`) and JSON Web Tokens (`jsonwebtoken`).
- **Secure Checkout**: Fully integrated with Razorpay for safe, secure, and instant payment overlay modals.
- **Modern UI**: Clean, responsive, and beautiful user interface built with Tailwind CSS v4.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS v4
- React Router DOM
- Context API (Global State)
- Lucide React (Icons)

**Backend:**
- Node.js & Express.js
- Prisma ORM
- PostgreSQL (Neon Serverless Cloud)
- Razorpay Node SDK (Payments)
- JSON Web Tokens (JWT)

---

## 💻 Running Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.
You will also need a free [Neon Database](https://neon.tech/) and a free [Stripe](https://stripe.com/) account for testing.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/Idukki-Origins.git
cd Idukki-Origins
```

### 2. Setup the Backend
Open a terminal and navigate to the backend folder:
```bash
cd backend
npm install
```

Create a `.env` file inside the `/backend` folder with the following variables:
```env
# Your direct PostgreSQL connection string from Neon
DATABASE_URL="postgresql://user:password@host.aws.neon.tech/neondb?sslmode=require&connect_timeout=20"

# Your Test Credentials from the Razorpay Dashboard
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"

# (Optional) A secret string for signing JWT tokens
JWT_SECRET="your_secret_key"
```

Push the database schema and seed the initial products:
```bash
npx prisma db push
node seed.js
```

Start the backend server:
```bash
npm run dev
```

### 3. Setup the Frontend
Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
npm install
```

*(Optional)* Set your key credentials in the backend `.env` file, and the frontend will automatically use them to present the overlay modal.

Start the frontend server:
```bash
npm run dev
```

### 4. Visit the Application
Open your browser and navigate to: `http://localhost:5173`

---
*Built with ❤️ and React.*
