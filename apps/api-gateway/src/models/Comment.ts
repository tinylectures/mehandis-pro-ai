export interface Comment {
  id: string;
  entityType: 'project' | 'quantity' | 'cost_item' | 'estimate';
  entityId: string;
  userId: string;
  content: string;
  parentCommentId?: string; // for threaded comments
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentCreate {
  entityType: 'project' | 'quantity' | 'cost_item' | 'estimate';
  entityId: string;
  content: string;
  parentCommentId?: string;
}

export interface CommentUpdate {
  content?: string;
  isResolved?: boolean;
}
