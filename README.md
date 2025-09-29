# Dulalia Homes Admin Dashboard

## 📋 Overview

The Dulalia Homes Admin Dashboard is a comprehensive web application built with React for managing residential properties at Dulalia Homes. This administrative interface provides tools for monitoring lots, handling service requests, managing security personnel, and maintaining resident accounts.

## ✨ Features

- **📊 Dashboard Analytics** - Visual overview of key metrics and activities
- **👮 Guard Management** - Create and manage security guard accounts and shifts
- **🏡 Lot Monitoring** - Track and update status of all residential lots
- **🛠️ Service Request Handling** - Process and track resident maintenance requests
- **📢 Announcement Management** - Create and publish announcements to residents
- **👥 User Account Administration** - Manage resident accounts and permissions
- **📝 Feedback Collection** - View and respond to resident feedback
- **📦 Inventory Management** - Track community assets and equipment
- **👋 Visitor Logs** - Monitor and manage visitor access to the property

## 🚀 Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v7.0.0 or later)
- Firebase account (for authentication and database)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/DomoAlert/Development-of-Lot-Monitoring-and-Help-Request-Management-System-at-Dulalia-Homes-admin-.git dulalia_admin
   ```

2. Navigate to the project directory:
   ```bash
   cd dulalia_admin
   ```

3. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

4. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

### Development

Run the app in development mode:

```bash
npm start
```

This will launch the application at [http://localhost:3000](http://localhost:3000).

### Production Build

Create a production-ready build:

```bash
npm run build
```

This generates optimized files in the `build` folder for deployment.

## 🧰 Tech Stack

- **React 18** - UI library
- **React Router 7** - Client-side routing
- **Firebase** - Authentication, database, and storage
- **TailwindCSS** - Utility-first CSS framework
- **Chart.js/React-Chartjs-2** - Data visualization
- **React Toastify** - Toast notifications
- **HeadlessUI** - Unstyled, accessible UI components

## 📁 Project Structure

```
dulalia_admin/
├── public/              # Static files
├── src/
│   ├── assets/          # Images and other assets
│   ├── components/      # Reusable UI components
│   ├── context/         # React context providers
│   ├── pages/           # Application pages
│   │   └── Admin/       # Admin-specific pages
│   ├── seed/            # Database seeding scripts
│   ├── services/        # API and service integrations
│   ├── styles/          # Global styles and Tailwind config
│   ├── __tests__/       # Test files
│   ├── App.jsx          # Main application component
│   └── index.jsx        # Application entry point
├── .env                 # Environment variables
├── package.json         # Dependencies and scripts
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── vercel.json          # Vercel deployment configuration
```

## 📄 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Runs the app in development mode |
| `npm test` | Launches the test runner |
| `npm run build` | Builds the app for production |
| `npm run eject` | Ejects from Create React App (one-way operation) |
| `npm run seed-service-types` | Seeds the database with service types |

## 🚢 Deployment

This project is configured for deployment on Vercel. The `vercel.json` file includes specific configurations for build commands and routing.

For other deployment platforms, follow the [Create React App deployment documentation](https://facebook.github.io/create-react-app/docs/deployment).

## 🛠️ Troubleshooting

### PostCSS Version Conflicts

If you encounter issues with PostCSS versions:

```bash
npm install postcss@7.0.39 --legacy-peer-deps
```

### Firebase Connectivity Issues

Verify your Firebase configuration in `src/services/firebase.jsx` and ensure all environment variables are correctly set.

## 📚 Learn More

- [React Documentation](https://reactjs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributors

- [John Marc Casimiro](https://github.com/DomoAlert)

---

Developed with AltF4(Doms) for Dulalia Homes | © 2025