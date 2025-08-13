# PestControl CRM Frontend

A modern React TypeScript frontend application for pest control management system built with Material-UI.

## 🚀 Features

- **Modern UI/UX**: Clean, responsive design with Material-UI components
- **Authentication**: Secure login/logout with JWT tokens
- **Dashboard**: Overview of business metrics and recent activities
- **Client Management**: Add, view, and manage client information
- **Job Card Management**: Create and track service job cards
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Dynamic data updates and notifications
- **Professional Styling**: Consistent design system with smooth animations

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Component library and design system
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Date-fns** - Date manipulation library
- **React Context** - State management

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/adnandoh/Pestcontrol-Crm-Frontend-.git
cd Pestcontrol-Crm-Frontend-
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

5. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components (AppBar, Sidebar)
│   ├── ModernTable.tsx # Enhanced table component
│   └── ...
├── pages/              # Page components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── JobCards.tsx    # Job cards listing
│   ├── CreateJobCard.tsx # Job card creation
│   └── Login.tsx       # Authentication
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── services/           # API services
│   └── api.ts          # API client and endpoints
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🎨 UI Components

- **Modern Table**: Enhanced data tables with pagination and search
- **Responsive Layout**: Adaptive sidebar and navigation
- **Form Components**: Styled forms with validation
- **Dashboard Cards**: Interactive metric cards
- **Status Chips**: Color-coded status indicators

## 🔧 Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🌐 API Integration

The frontend connects to the PestControl99 Backend API:
- Authentication endpoints
- Client management
- Job card operations
- Dashboard data

## 📱 Responsive Design

- **Desktop**: Full sidebar navigation with expanded content
- **Tablet**: Collapsible sidebar with optimized layouts
- **Mobile**: Mobile-first design with touch-friendly interfaces

## 🎯 Key Features

### Authentication
- Secure JWT-based authentication
- Protected routes
- Automatic token refresh
- User session management

### Dashboard
- Business metrics overview
- Recent activity feed
- Quick action buttons
- Interactive charts and stats

### Job Management
- Create new job cards
- View and edit existing jobs
- Status tracking
- Client information integration

### Client Management
- Add new clients
- Client selection with search
- Contact information management
- Service history tracking

## 🚀 Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `build` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related Projects

- [PestControl99 Backend](https://github.com/adnandoh/pestcontrol99-Backend-) - Django REST API backend

## 📞 Support

For support and questions, please open an issue in the GitHub repository.