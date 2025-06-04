// import { z } from "zod"

// // Base WebSocket Message Schema
// export const WebSocketMessageSchema = z.object({
//   type: z.string(),
//   data: z.any(),
//   timestamp: z.number().optional()
// })

// // Space Events
// export const JoinSpaceEventSchema = z.object({
//   type: z.literal("join-space"),
//   data: z.object({
//     spaceId: z.string()
//   })
// })

// export const LeaveSpaceEventSchema = z.object({
//   type: z.literal("leave-space"),
//   data: z.object({
//     spaceId: z.string()
//   })
// })

// export const SpaceUpdatedEventSchema = z.object({
//   type: z.literal("space-updated"),
//   data: z.object({
//     spaceId: z.string(),
//     changes: z.object({
//       name: z.string().optional(),
//       isPublic: z.boolean().optional()
//     })
//   })
// })

// // Real-time Snippet Events
// export const SnippetUpdateEventSchema = z.object({
//   type: z.literal("snippet-update"),
//   data: z.object({
//     snippetId: z.string(),
//     spaceId: z.string(),
//     field: z.enum(["code", "title", "description"]),
//     value: z.string(),
//     cursorPosition: z.number().optional()
//   })
// })

// export const SnippetMoveEventSchema = z.object({
//   type: z.literal("snippet-move"),
//   data: z.object({
//     snippetId: z.string(),
//     spaceId: z.string(),
//     x: z.number(),
//     y: z.number()
//   })
// })

// export const SnippetCreatedEventSchema = z.object({
//   type: z.literal("snippet-created"),
//   data: z.object({
//     spaceId: z.string(),
//     snippet: z.object({
//       id: z.string(),
//       title: z.string(),
//       x: z.number(),
//       y: z.number()
//     })
//   })
// })

// export const SnippetDeletedEventSchema = z.object({
//   type: z.literal("snippet-deleted"),
//   data: z.object({
//     snippetId: z.string(),
//     spaceId: z.string()
//   })
// })

// // Collaboration Events
// export const CursorMoveEventSchema = z.object({
//   type: z.literal("cursor-move"),
//   data: z.object({
//     snippetId: z.string(),
//     userId: z.string(),
//     position: z.number(),
//     selection: z.object({
//       start: z.number(),
//       end: z.number()
//     }).optional()
//   })
// })

// export const TypingIndicatorEventSchema = z.object({
//   type: z.literal("typing"),
//   data: z.object({
//     snippetId: z.string(),
//     userId: z.string(),
//     isTyping: z.boolean()
//   })
// })

// export const CollaboratorJoinedEventSchema = z.object({
//   type: z.literal("collaborator-joined"),
//   data: z.object({
//     spaceId: z.string(),
//     user: z.object({
//       id: z.string(),
//       name: z.string(),
//       email: z.string()
//     })
//   })
// })

// // View Events
// export const ViewRecordEventSchema = z.object({
//   type: z.literal("view-recorded"),
//   data: z.object({
//     spaceId: z.string().optional(),
//     snippetId: z.string().optional()
//   })
// })

// export const ActiveViewersUpdateSchema = z.object({
//   type: z.literal("active-viewers-update"),
//   data: z.object({
//     spaceId: z.string(),
//     count: z.number(),
//     viewers: z.array(z.object({
//       userId: z.string(),
//       name: z.string()
//     })).optional()
//   })
// })

// // Error Events
// export const ErrorEventSchema = z.object({
//   type: z.literal("error"),
//   data: z.object({
//     message: z.string(),
//     code: z.string().optional(),
//     originalEvent: z.string().optional()
//   })
// })

// // Authentication Events
// export const AuthEventSchema = z.object({
//   type: z.literal("authenticate"),
//   data: z.object({
//     token: z.string()
//   })
// })

// // Presence Events
// export const PresenceUpdateSchema = z.object({
//   type: z.literal("presence-update"),
//   data: z.object({
//     spaceId: z.string(),
//     userId: z.string(),
//     status: z.enum(["online", "away", "offline"]),
//     lastSeen: z.number()
//   })
// })

// // Batch Operations
// export const BatchSnippetUpdateSchema = z.object({
//   type: z.literal("batch-snippet-update"),
//   data: z.object({
//     spaceId: z.string(),
//     updates: z.array(z.object({
//       snippetId: z.string(),
//       changes: z.object({
//         x: z.number().optional(),
//         y: z.number().optional(),
//         code: z.string().optional()
//       })
//     }))
//   })
// })

// // Union of all WebSocket events for validation
// export const WebSocketEventSchema = z.discriminatedUnion("type", [
//   JoinSpaceEventSchema,
//   LeaveSpaceEventSchema,
//   SpaceUpdatedEventSchema,
//   SnippetUpdateEventSchema,
//   SnippetMoveEventSchema,
//   SnippetCreatedEventSchema,
//   SnippetDeletedEventSchema,
//   CursorMoveEventSchema,
//   TypingIndicatorEventSchema,
//   CollaboratorJoinedEventSchema,
//   ViewRecordEventSchema,
//   ActiveViewersUpdateSchema,
//   ErrorEventSchema,
//   AuthEventSchema,
//   PresenceUpdateSchema,
//   BatchSnippetUpdateSchema
// ])