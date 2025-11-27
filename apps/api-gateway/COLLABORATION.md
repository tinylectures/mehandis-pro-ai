# Real-Time Collaboration System

This document describes the real-time collaboration features implemented using Socket.io.

## Overview

The collaboration system enables multiple users to work on the same project simultaneously with real-time updates for:
- Data changes (quantities, costs, etc.)
- Cursor positions
- User presence
- Comments and annotations
- Conflict resolution

## Architecture

The system uses Socket.io for WebSocket connections with the following components:

- **CollaborationService**: Manages WebSocket connections, rooms, and event broadcasting
- **CommentService**: Handles comments with real-time updates
- **Socket.io Server**: Integrated with the HTTP server for WebSocket support

## Client Connection

### Authentication

All WebSocket connections require JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected to collaboration server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

### Joining a Project Room

To receive updates for a specific project:

```javascript
socket.emit('join:project', 'project-id-here');

// Listen for active users
socket.on('users:active', (users) => {
  console.log('Active users:', users);
  // users = [{ userId, userName, cursor }, ...]
});

// Listen for user joined events
socket.on('user:joined', (data) => {
  console.log('User joined:', data.userName);
});

// Listen for user left events
socket.on('user:left', (data) => {
  console.log('User left:', data.userName);
});
```

### Leaving a Project Room

```javascript
socket.emit('leave:project', 'project-id-here');
```

## Real-Time Features

### Cursor Tracking

Track and display collaborator cursor positions:

```javascript
// Send cursor updates
socket.emit('cursor:update', {
  projectId: 'project-id',
  position: {
    x: 100,
    y: 200,
    elementId: 'optional-element-id',
    page: 'quantities'
  }
});

// Receive cursor updates from others
socket.on('cursor:moved', (data) => {
  console.log(`${data.userName} moved cursor to:`, data.position);
  // Update UI to show collaborator cursor
});
```

### Data Change Broadcasting

Broadcast changes to all collaborators:

```javascript
// Send data change
socket.emit('data:change', {
  projectId: 'project-id',
  change: {
    entityType: 'quantity',
    entityId: 'qty-123',
    action: 'update', // 'create', 'update', or 'delete'
    data: { value: 150, unit: 'cy' },
    userId: 'user-id',
    timestamp: new Date()
  }
});

// Receive data changes from others
socket.on('data:changed', (change) => {
  console.log('Data changed:', change);
  // Update local state with the change
});
```

### Conflict Resolution

When conflicts occur (simultaneous edits):

```javascript
socket.on('conflict:resolved', (data) => {
  console.log('Conflict resolved:', data);
  // data = { conflictId, resolution, resolvedBy, timestamp }
});
```

## Comments API

### Create a Comment

```http
POST /api/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "entityType": "quantity",
  "entityId": "qty-123",
  "content": "This quantity looks incorrect",
  "parentCommentId": null  // optional, for threaded replies
}
```

### Get Comments for an Entity

```http
GET /api/comments/quantity/qty-123?threaded=true
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": "comment-1",
    "entityType": "quantity",
    "entityId": "qty-123",
    "userId": "user-1",
    "content": "This quantity looks incorrect",
    "parentCommentId": null,
    "isResolved": false,
    "createdAt": "2024-01-05T10:00:00Z",
    "updatedAt": "2024-01-05T10:00:00Z",
    "replies": [
      {
        "id": "comment-2",
        "content": "I'll check it",
        "userId": "user-2",
        ...
      }
    ]
  }
]
```

### Update a Comment

```http
PATCH /api/comments/comment-1
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated comment text",
  "isResolved": true
}
```

### Delete a Comment

```http
DELETE /api/comments/comment-1
Authorization: Bearer <token>
```

### Mark Comment as Resolved

```http
POST /api/comments/comment-1/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "isResolved": true
}
```

## Server-Side API

### Broadcasting Changes Programmatically

```typescript
import { collaborationService } from './index';

// Broadcast a change to all users in a project
await collaborationService.broadcastChange('project-id', {
  entityType: 'cost_item',
  entityId: 'cost-456',
  action: 'create',
  data: { description: 'New cost item', unitCost: 50 },
  userId: 'user-id',
  timestamp: new Date()
});
```

### Getting Active Users

```typescript
const activeUsers = await collaborationService.getActiveUsers('project-id');
console.log('Active users:', activeUsers);
```

### Tracking Cursor Positions

```typescript
await collaborationService.trackUserCursor('project-id', 'user-id', {
  x: 100,
  y: 200,
  elementId: 'element-123'
});
```

### Resolving Conflicts

```typescript
await collaborationService.resolveConflict('conflict-id', {
  conflictId: 'conflict-id',
  resolution: 'accept',
  resolvedBy: 'user-id'
});
```

## Events Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join:project` | `projectId: string` | Join a project room |
| `leave:project` | `projectId: string` | Leave a project room |
| `cursor:update` | `{ projectId, position }` | Update cursor position |
| `data:change` | `{ projectId, change }` | Broadcast a data change |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `users:active` | `ActiveUser[]` | List of active users (sent on join) |
| `user:joined` | `{ userId, userName }` | User joined the project |
| `user:left` | `{ userId, userName }` | User left the project |
| `cursor:moved` | `{ userId, userName, position }` | Collaborator moved cursor |
| `data:changed` | `DataChange` | Data was changed by collaborator |
| `conflict:resolved` | `{ conflictId, resolution, resolvedBy, timestamp }` | Conflict was resolved |
| `error` | `{ message }` | Error occurred |

## Best Practices

1. **Always authenticate**: Include JWT token in connection auth
2. **Join rooms**: Always join a project room before emitting changes
3. **Handle disconnections**: Implement reconnection logic with exponential backoff
4. **Debounce cursor updates**: Don't send cursor updates on every mouse move (throttle to ~100ms)
5. **Optimistic updates**: Update local UI immediately, then sync with server
6. **Conflict handling**: Implement last-write-wins or custom conflict resolution
7. **Clean up**: Leave rooms and disconnect sockets when component unmounts

## Example React Hook

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useCollaboration(projectId: string, token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      newSocket.emit('join:project', projectId);
    });

    newSocket.on('users:active', setActiveUsers);
    newSocket.on('user:joined', (user) => {
      setActiveUsers(prev => [...prev, user]);
    });
    newSocket.on('user:left', (user) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave:project', projectId);
      newSocket.disconnect();
    };
  }, [projectId, token]);

  return { socket, activeUsers };
}
```

## Testing

Run the collaboration service tests:

```bash
npm test -- CollaborationService.test.ts --run
```

## Security Considerations

1. **Authentication**: All connections require valid JWT tokens
2. **Authorization**: Users can only join projects they have access to (implement project access checks)
3. **Rate limiting**: Consider implementing rate limits on socket events
4. **Input validation**: Validate all incoming socket event data
5. **XSS protection**: Sanitize comment content before displaying

## Performance

- WebSocket connections are persistent and efficient
- Room-based broadcasting ensures users only receive relevant updates
- Cursor updates should be throttled to avoid overwhelming the server
- Consider implementing message queuing for high-traffic scenarios

## Troubleshooting

### Connection Issues

- Verify JWT token is valid and not expired
- Check CORS configuration in CollaborationService
- Ensure firewall allows WebSocket connections
- Try falling back to polling transport

### Not Receiving Updates

- Verify you've joined the correct project room
- Check that other users are in the same room
- Ensure event listeners are registered before emitting events

### High Latency

- Check network conditions
- Consider geographic proximity to server
- Implement message batching for bulk updates
- Use Redis pub/sub for horizontal scaling
