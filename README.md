# 🧭 Campus Compass

Welcome to **Campus Compass**! 🎓📍 A modern, real-time tracking, management, and navigation platform designed for campus operations. Built to be fast, secure, and scalable using Next.js, Firebase, and Leaflet. 🚀

---

## ✨ Key Features

- 🗺️ **Live Tracking**: Real-time location mapping of campus assets and buses (`react-leaflet`).
- 🔐 **Secure Role-based Access**: Custom dashboards tailored for **Admins**, **Staff**, and **Students**.
- 🎥 **Live Video Streaming**: Integrated HLS camera streams with specialized JWT-based token security for real-time monitoring.
- ⚡ **Real-time Synchronization**: Powered by Firebase (Firestore/Realtime Database) for instant updates across all connected clients.
- 🎨 **Modern & Responsive UI**: Beautifully designed with **Tailwind CSS** and **Lucide React** icons.
- 📱 **Mobile-Friendly**: Fully optimized for seamless use on smartphones, tablets, and desktops.

---

## 🛠️ Tech Stack

**Frontend:**
- ⚛️ [Next.js (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- 💅 [Tailwind CSS v4](https://tailwindcss.com/) for rapid styling
- 🗺️ [Leaflet](https://leafletjs.com/) & `react-leaflet` for interactive maps
- 🖼️ `lucide-react` for beautifully crisp UI icons

**Backend & Infrastructure:**
- 🔥 [Firebase](https://firebase.google.com/) (Auth, Routing, DB)
- 📡 MediaMTX & custom Node.js adapters for secure HLS video streams
- 🔒 Secure environment variable management & JWT sign-ins

---

## 🚀 Getting Started

Ready to run the project locally? It's simple!

### 1️⃣ Installation

Make sure you've cloned the repository and navigated to the project folder, then install the dependencies:

```bash
npm install
# or yarn install
# or pnpm install
```

*(Note: Requires Node.js 20+)*

### 2️⃣ Environment Variables

Duplicate the `.env.example` file to create a `.env.local` file and securely add your Firebase keys and external service URLs:

```bash
cp .env.example .env.local
```

### 3️⃣ Start the Server

Kick off the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The map component and UI will auto-update as you edit files! 🪄

---

## 🧪 Testing

Quality is a priority! You can run our various test suites using the pre-configured scripts:

- 🟢 **Unit Tests:** `npm run test:unit`
- 🔵 **Integration Tests:** `npm run test:integration`
- 🔴 **Smoke Tests:** `npm run test:smoke`
- 🛡️ **Security Tests:** `npm run test:security`
- 🏎️ **Performance Tests:** `npm run test:performance`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page] if you want to contribute.

💡 **Pro Tip**: Use the built-in lint script (`npm run lint`) before committing your code to keep everything clean and consistent!

---
*Built with ❤️ for better campus navigation.*
