import { z } from "zod"

// Authentication Schemas
export const SignupSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  name: z.string().min(1, "Name is required").optional(),
  password: z.string().min(5, "Password must be at least 5 characters"),
  role: z.enum(["user", "admin"]).default("user")
})

export const SigninSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  password: z.string().min(1, "Password is required")
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
})

// User Schemas
export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  // role: z.enum(["user", "admin"]).default("user")
  // image: z.string().url("Invalid image URL").optional()
})
export const UpdateUserProfileSchemaAdmin = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  role: z.enum(["user", "admin"]).default("user")
  // image: z.string().url("Invalid image URL").optional()
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(5, "New password must be at least 5 characters")
})

// Space Schemas
export const CreateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100, "Name too long"),
  isPublic: z.boolean().default(true),
  description: z.string().max(500, "Description too long").optional()
})

export const UpdateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100, "Name too long").optional(),
  isPublic: z.boolean().optional(),
  description: z.string().max(500, "Description too long").optional()
})

export const UpdateSpaceVisibilitySchema = z.object({
  isPublic: z.boolean()
})

export const UpdateSpaceOrderSchema = z.object({
  order: z.array(z.string()).min(0, "Order array cannot be empty")
})

// Collaborator Schemas
export const AddCollaboratorSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  role: z.enum(["VIEWER", "EDITOR", "ADMIN"]).default("EDITOR")
})

export const UpdateCollaboratorRoleSchema = z.object({
  role: z.enum(["VIEWER", "EDITOR", "ADMIN"])
})

// Snippet Schemas
export const CreateSnippetSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  code: z.string().optional(),
  tags: z.array(z.string()).max(10, "Too many tags").default([]),
  color: z.string().optional(),
  files: z.array(z.string().url("Invalid file URL")).max(5, "Too many files").default([]), //keep limits for supabase
  x: z.coerce.number().int("X coordinate must be integer"),
  y: z.coerce.number().int("Y coordinate must be integer"),
  spaceId: z.string().optional()
})

export const UpdateSnippetSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  code: z.string().optional(),
  tags: z.array(z.string()).max(10, "Too many tags").optional(),
  color: z.string().optional(),
  files: z.array(z.string().url("Invalid file URL")).max(5, "Too many files").optional(), //keeping limits cuz supabase
  x: z.coerce.number().int("X coordinate must be integer").optional(),
  y: z.coerce.number().int("Y coordinate must be integer").optional()
})

export const AddSnippetToSpaceSchema = z.object({
  snippetId: z.string().min(1, "Snippet ID is required"),
  x: z.coerce.number().int("X coordinate must be integer"),
  y: z.coerce.number().int("Y coordinate must be integer")
})

export const MoveSnippetSchema = z.object({
  x: z.coerce.number().int("X coordinate must be integer"),
  y: z.coerce.number().int("Y coordinate must be integer")
})

// Search Schemas
export const SearchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(100, "Query too long"),
  type: z.enum(["snippets", "spaces", "all"]).default("all"),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().default(0)
})

// Analytics Schemas
export const RecordViewSchema = z.object({
  spaceId: z.string().optional(),
  snippetId: z.string().optional(),
  ipAddress: z.string().ip("Invalid IP address").optional(),
  userAgent: z.string().max(500, "User agent too long").optional()
})

export const AnalyticsQuerySchema = z.object({
  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),
  groupBy: z.enum(["day", "week", "month"]).default("day")
})

// Admin Schemas
export const AdminUserUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  type: z.enum(["user", "admin"]).optional()
})

// export const AdminSpaceUpdateSchema = z.object({
//   name: z.string().min(1, "Space name is required").optional(),
//   isPublic: z.boolean().optional(),
//   ownerId: z.string().optional()
// })
export const AdminSpaceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  // Admin-specific fields that regular users might not be able to update
  ownerId: z.string().uuid().optional(), // Allow admin to change ownership
  isActive: z.boolean().optional(), // Allow admin to activate/deactivate spaces
  isFeatured: z.boolean().optional(), // Allow admin to feature spaces
}).strict();

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

// ID Parameter Schema
export const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required")
})
