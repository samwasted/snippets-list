# 🚀 Snippets Management App

A powerful, collaborative code snippets management platform with real-time collaboration, drag-and-drop functionality, and intelligent syntax highlighting.

🌐 **Live Demo**: [https://snippets-list.vercel.app](https://snippets-list.vercel.app)


<img alt="dashboard" src="https://github.com/user-attachments/assets/15cc662f-a22d-4bbd-b9d5-036af009984e" />
*Main dashboard with multiple snippet spaces*

## ✨ Features

### 🎯 Core Functionality
- **Visual Canvas**: Freely moveable snippet boxes on a large interactive canvas
- **Smart Code Detection**: Automatic language detection and syntax highlighting
- **File Operations**: Drag & drop code files, edit, download, and change extensions
- **Real-time Collaboration**: Live editing with WebSocket connections
- **Responsive Design**: Complete functionality across desktop and mobile devices

![canvas](https://github.com/user-attachments/assets/1b657c73-d020-4731-bd60-806125b508fc)<br>
*Interactive canvas with moveable snippet boxes*

### 🔐 Authentication & Security
- JWT-based authentication system
- Password encryption and secure user management
- Role-based access control (Admin, Editor, Viewer)
- Admin dashboard for user and content management

### 🏢 Spaces Management
- Create and organize snippet collections in dedicated spaces
- Public/Private space visibility settings
- Collaborative workspaces with granular permissions
- Space ownership and admin controls

![collaborator](https://github.com/user-attachments/assets/31d26611-f76b-4dda-89af-e202d1a05b2a)
<br>
*Space settings with collaborator management*

### 🎨 Customization & UI
- **Color Coding**: Customize snippet box colors and tag-based coloring
- **Dark/Light Mode**: Toggle between themes
- **Expandable Modals**: Resizable edit interfaces
- **Smooth Animations**: Framer Motion powered transitions
- **Vibey UI**: Modern, intuitive design language


![darklightmode](https://github.com/user-attachments/assets/b785b5a6-5721-4b66-ba52-f8e61d0b4901)  
![tagcolormenu](https://github.com/user-attachments/assets/83eb1614-64fc-419b-aac7-42f837424d2a)  

<br>

*Tag-based color coding and customization options*

### 🔍 Organization & Discovery
- **Sidebar Navigation**: Collapsible sidebar with full snippet overview
- **Drag & Drop Reordering**: Reorganize snippets through sidebar
- **Tag System**: Filter and organize snippets by tags
- **Search Functionality**: Find snippets by title quickly
- **Click Navigation**: Jump to specific snippets instantly

![sidebarnavigation](https://github.com/user-attachments/assets/f3983106-7918-49bb-87ff-6e2de4908f31)
<br>
*Collapsible sidebar with search, tags, and collaborators*

### 👥 Collaboration Features
- **Real-time Editing**: See changes as they happen
- **Collaborator Management**: Add/remove team members with specific roles
- **WebSocket Status**: Live connection monitoring
- **Mobile Block Dragging**: Special mobile-optimized controls

  
![livecollaboration](https://github.com/user-attachments/assets/deb39d33-6997-4198-a773-ad4f50ad0bde)
<br>
*Live collaboration in action*

### 📊 Analytics & Insights
- **Usage Analytics**: Track recent views and activity
- **Visual Data**: Charts and graphs for usage patterns
- **Performance Metrics**: Understand your snippet usage

<img width="1257" alt="analytics" src="https://github.com/user-attachments/assets/c5b1df25-dbd2-41d0-a9f2-2c8b83f6c87b" />
<br>
*Analytics section with visual data representation*

### 📱 Mobile Experience
- **Fully Responsive**: Complete feature parity on mobile
- **Touch Optimized**: Mobile-specific drag controls
- **Adaptive UI**: Interface adjusts seamlessly to screen sizes
<img width="293" alt="space_canvas_mobile" src="https://github.com/user-attachments/assets/1573fe47-59b9-4b47-bcd8-9ea81e77d80d" />
<br>
*Mobile-responsive design with touch controls*

## 🛠️ Tech Stack

### Frontend
- **React** + **TypeScript** for type-safe UI development
- **dnd-kit** for smooth drag-and-drop functionality
- **Framer Motion** for fluid animations and transitions
- **TailwindCSS** for responsive design and styling
- **CodeMirror** for advanced code syntax highlighting
- **Lucide React** for smooth icon animations

### Backend
- **Express.js** + **TypeScript** for server-side logic
- **WebSocket** for real-time collaboration
- **HTTP REST API** for standard operations
- **Zod** for runtime type validation
- **JWT** for secure authentication

### Database & Infrastructure
- **Prisma** ORM for database management
- **Turbo Monorepo** for organized codebase
- **pnpm** for efficient package management

### Deployment
- **Frontend**: Vercel for fast, global CDN delivery
- **Backend**: Render for reliable server hosting

## 🏗️ Architecture

```
├── snippets-frontend/       # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
│
└── snippets-backend/        # Turbo monorepo for backend
    ├── apps/
    │   ├── api/             # Express HTTP server
    │   └── ws/              # WebSocket server
    ├── packages/
    │   ├── database/        # Prisma schema & migrations
    │   ├── types/           # Shared TypeScript types
    │   └── utils/           # Common utilities
    └── turbo.json          # Turbo configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- Database (PostgreSQL recommended)

The application consists of two separate repositories:
- **Frontend**: React application with TypeScript and TailwindCSS
- **Backend**: Express.js monorepo with Prisma database integration

Clone both repositories and follow their respective setup instructions to get started with development.


## 🎮 Usage

### Creating Your First Space
1. Sign up and log into your dashboard
2. Click "Create Space" to start a new snippet collection
3. Choose between public or private visibility
4. Start adding snippets to your canvas!

### Adding Snippets
- **Manual**: Click "Add Snippet" in the header
- **Drag & Drop**: Drop code files directly onto the canvas
- **Edit Mode**: Click any snippet to edit code, description, or styling

### Collaboration
1. Open space settings from the sidebar
2. Add collaborators by username
3. Assign roles (Admin/Editor/Viewer)
4. Share the space URL with your team
5. Click on any collaborator to view their profile and public spaces


## 🔧 API Routes

### Authentication
- `POST /signup` - User registration with name, username, password, and optional admin role
- `POST /signin` - User login with username and password, returns JWT token and user data
- `POST /signout` - User logout (client-side token removal)
- `POST /refresh-token` - Refresh JWT token and get updated user information

### Search & Discovery
- `GET /search/spaces` - Search public spaces and snippets by query with pagination

### System Health
- `GET /health` - Health check endpoint returning service status and timestamp

### User Management Routes (/user)

#### Profile Management
- `GET /user/profile` - Get current user profile or target user profile (admin only)
- `PUT /user/profile` - Update user profile information (admin can update any user)
- `POST /user/metadata` - Update user metadata (username, name)
- `GET /user/metadata` - Get user metadata with admin override capability
- `GET /user/metadata/bulk` - Get bulk user metadata (admin only)

#### Password Management
- `PUT /user/password` - Change user password (admin can change any user's password)

#### User Content
- `GET /user/spaces` - Get user's owned spaces with pagination
- `GET /user/spaces/collaborating` - Get spaces where user is a collaborator
- `GET /user/snippets` - Get user's snippets with pagination

#### Analytics
- `GET /user/analytics/views` - Get user's view analytics with date filtering
- `GET /user/analytics/activity` - Get user's recent activity and creation statistics

#### Public Profile Routes
- `GET /user/profile/:username` - Get public user profile by username (no auth required)
- `GET /user/:userId/spaces/public` - Get public spaces for a specific user (no auth required)

### Space Management Routes (/space)

#### Space Operations
- `POST /space/` - Create new space with name, description, and visibility settings
- `GET /space/all` - Get all user spaces (admin sees all spaces, users see owned/collaborated)
- `GET /space/public` - Get all public spaces with pagination
- `GET /space/:id` - Get single space details with snippets and collaborator count
- `PUT /space/:id` - Update space information (admin/owner only)
- `DELETE /space/:id` - Delete space (owner or global admin only)

#### Snippet Management within Spaces
- `POST /space/:id/snippet` - Create snippet in specific space
- `GET /space/:id/snippets` - Get all snippets in a space
- `PUT /space/:id/snippet/:snippetId` - Update specific snippet in space
- `DELETE /space/:id/snippet/:snippetId` - Delete specific snippet from space

#### Collaboration Management
- `POST /space/:id/collaborators` - Add collaborator to space with role assignment
- `GET /space/:id/collaborators` - Get all space collaborators
- `PUT /space/:id/collaborators/:userId` - Update collaborator role (owner/admin only)
- `DELETE /space/:id/collaborators/:userId` - Remove collaborator from space
- `GET /space/:id/collaborators/metadata` - Get detailed collaborator information and statistics

#### Space Settings
- `PUT /space/:id/visibility` - Change space visibility (public/private)
- `PUT /space/:id/order` - Update snippet ordering within space

#### Space Analytics
- `GET /space/:id/analytics` - Get space analytics with view statistics and date filtering
- `GET /space/:id/views` - Get space view history with pagination

### Admin Management Routes (/admin)

#### User Administration
- `GET /admin/users` - List all users with pagination and statistics
- `PUT /admin/user/:userId` - Update any user's profile and promote to admin
- `DELETE /admin/user/:userId` - Delete user and all associated data

#### Space Administration
- `GET /admin/spaces` - List all spaces with owner information and statistics
- `PUT /admin/space/:spaceId` - Update any space settings
- `DELETE /admin/space/:spaceId` - Delete any space and associated data

#### Snippet Administration
- `GET /admin/snippet/:snippetId` - Get snippet details with owner and space information
- `PUT /admin/snippet/:snippetId` - Update any snippet
- `DELETE /admin/snippet/:snippetId` - Delete any snippet

#### System Analytics
- `GET /admin/map` - Get system overview with user, space, and snippet counts plus recent activity
- `GET /admin/analytics/views` - Get comprehensive view analytics with date filtering
- `GET /admin/analytics/popular` - Get most popular snippets, spaces, and top users

### WebSocket Routes (/ws)

#### Connection Establishment
- `WebSocket /ws/space/:spaceId` - Establish WebSocket connection to specific space for real-time collaboration

#### Connection Management
The WebSocket server handles connections with the following features:
- **Connection Validation**: Validates space ID format and path structure
- **Heartbeat Monitoring**: Automatic ping/pong every 30 seconds with connection health checks
- **Graceful Cleanup**: Automatic cleanup of stale connections (60-second timeout)
- **Connection Tracking**: Server-side tracking of active connections with unique IDs

## 🎨 Customization

### Theme Configuration
The app supports extensive theming through TailwindCSS with custom CSS variables:

```css
@import "tailwindcss"
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-primary: #3b82f6;
  --color-success: #10b981;
}

/* Dark mode overrides */
@layer theme {
  .dark {
    --color-background: #1f2937;
    --color-surface: #374151;
    --color-text: #f9fafb;
    --color-text-secondary: #d1d5db;
    --color-border: #4b5563;
    --color-primary: #60a5fa;
    --color-success: #34d399;
  }
}
@plugin 'tailwind-scrollbar';
```

### Syntax Highlighting
CodeMirror integration provides syntax highlighting for 50+ programming languages including JavaScript, Python, TypeScript, CSS, HTML, and many more popular languages.

---

<div align="center">
  <strong>Made by samwasted for CSoC 25</strong>
</div>


<div align="center">
  <img src="https://github.com/user-attachments/assets/b26a439a-e16b-4a84-bb2b-f032dbf7262a" alt="banner" />
</div>
