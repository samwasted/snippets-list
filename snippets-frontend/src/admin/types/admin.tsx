// src/types/admin.ts
export interface User {
  id: string;
  username: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  _count: {
    spaces: number;
    snippets: number;
  };
}

export interface Space {
  id: string;
  name: string;
  owner: {
    id: string;
    username: string;
    name: string;
  };
  _count: {
    snippets: number;
    collaborators: number;
    views: number;
  };
  updatedAt: string;
}

export interface Snippet {
  id: string;
  title: string;
  owner: {
    id: string;
    username: string;
    name: string;
  };
  space: {
    id: string;
    name: string;
  };
  _count: {
    views: number;
  };
  createdAt: string;
  totalViews?: number; // Add this for popular snippets
}

// API Response Types
export interface UsersResponse {
  users: User[];
  totalUsers: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SpacesResponse {
  spaces: Space[];
  totalSpaces: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MapResponse {
  analytics: {
    totalUsers: number;
    totalSpaces: number;
    totalSnippets: number;
  };
  recentActivity: Snippet[];
  pagination: {
    page: number;
    limit: number;
  };
}

export interface AnalyticsViewsResponse {
  snippetViews: Array<{
    id: string;
    viewedAt: string;
    snippet: {
      id: string;
      title: string;
      owner: {
        id: string;
        username: string;
      };
    };
  }>;
  spaceViews: Array<{
    id: string;
    viewedAt: string;
    space: {
      id: string;
      name: string;
      owner: {
        id: string;
        username: string;
      };
    };
  }>;
  totalSnippetViews: number;
  totalSpaceViews: number;
  totalViews: number;
  groupBy?: string;
}

export interface PopularContentResponse {
  popularSnippets: Snippet[];
  popularSpaces: Space[];
  topUsers: User[];
  pagination: {
    page: number;
    limit: number;
  };
}

export interface SnippetResponse {
  snippet: Snippet;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}
// src/types/admin.ts - Add search support to UsersResponse
export interface UsersResponse {
  users: User[];
  totalUsers: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  searchQuery?: string; // Add this for search context
}
