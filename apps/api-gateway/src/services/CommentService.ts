import { CommentRepository } from '../repositories/CommentRepository';
import { Comment, CommentCreate, CommentUpdate } from '../models/Comment';
import { CollaborationService } from './CollaborationService';

export class CommentService {
  private commentRepository: CommentRepository;
  private collaborationService?: CollaborationService;

  constructor(commentRepository: CommentRepository, collaborationService?: CollaborationService) {
    this.commentRepository = commentRepository;
    this.collaborationService = collaborationService;
  }

  /**
   * Add a comment to an entity
   */
  async addComment(userId: string, commentData: CommentCreate): Promise<Comment> {
    // Create the comment
    const comment = await this.commentRepository.create(userId, commentData);

    // Broadcast the new comment to collaborators if collaboration service is available
    if (this.collaborationService) {
      // Determine the project ID based on entity type
      // For now, we'll use the entityId as projectId for project comments
      // In a real implementation, you'd look up the project ID based on the entity
      const projectId = commentData.entityType === 'project' 
        ? commentData.entityId 
        : await this.getProjectIdForEntity(commentData.entityType, commentData.entityId);

      if (projectId) {
        await this.collaborationService.broadcastChange(projectId, {
          entityType: 'comment',
          entityId: comment.id,
          action: 'create',
          data: comment,
          userId,
          timestamp: new Date(),
        });
      }
    }

    return comment;
  }

  /**
   * Get all comments for an entity
   */
  async getComments(entityType: string, entityId: string): Promise<Comment[]> {
    return this.commentRepository.findByEntity(entityType, entityId);
  }

  /**
   * Get a comment by ID
   */
  async getComment(commentId: string): Promise<Comment | null> {
    return this.commentRepository.findById(commentId);
  }

  /**
   * Get threaded comments (with replies)
   */
  async getThreadedComments(entityType: string, entityId: string): Promise<any[]> {
    // Get all top-level comments
    const topLevelComments = await this.commentRepository.findTopLevelComments(entityType, entityId);

    // For each top-level comment, get its replies recursively
    const threaded = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await this.getRepliesRecursive(comment.id);
        return {
          ...comment,
          replies,
        };
      })
    );

    return threaded;
  }

  /**
   * Get replies to a comment recursively
   */
  private async getRepliesRecursive(commentId: string): Promise<any[]> {
    const replies = await this.commentRepository.findReplies(commentId);

    return Promise.all(
      replies.map(async (reply) => {
        const nestedReplies = await this.getRepliesRecursive(reply.id);
        return {
          ...reply,
          replies: nestedReplies,
        };
      })
    );
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, updates: CommentUpdate): Promise<Comment | null> {
    // Verify the comment exists and belongs to the user
    const existingComment = await this.commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comment not found');
    }

    if (existingComment.userId !== userId) {
      throw new Error('Unauthorized to update this comment');
    }

    // Update the comment
    const updatedComment = await this.commentRepository.update(commentId, updates);

    // Broadcast the update to collaborators
    if (this.collaborationService && updatedComment) {
      const projectId = existingComment.entityType === 'project'
        ? existingComment.entityId
        : await this.getProjectIdForEntity(existingComment.entityType, existingComment.entityId);

      if (projectId) {
        await this.collaborationService.broadcastChange(projectId, {
          entityType: 'comment',
          entityId: commentId,
          action: 'update',
          data: updatedComment,
          userId,
          timestamp: new Date(),
        });
      }
    }

    return updatedComment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    // Verify the comment exists and belongs to the user
    const existingComment = await this.commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comment not found');
    }

    if (existingComment.userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    // Delete the comment
    const deleted = await this.commentRepository.delete(commentId);

    // Broadcast the deletion to collaborators
    if (this.collaborationService && deleted) {
      const projectId = existingComment.entityType === 'project'
        ? existingComment.entityId
        : await this.getProjectIdForEntity(existingComment.entityType, existingComment.entityId);

      if (projectId) {
        await this.collaborationService.broadcastChange(projectId, {
          entityType: 'comment',
          entityId: commentId,
          action: 'delete',
          data: { id: commentId },
          userId,
          timestamp: new Date(),
        });
      }
    }

    return deleted;
  }

  /**
   * Mark a comment as resolved/unresolved
   */
  async markResolved(commentId: string, userId: string, isResolved: boolean): Promise<Comment | null> {
    const comment = await this.commentRepository.markResolved(commentId, isResolved);

    // Broadcast the resolution to collaborators
    if (this.collaborationService && comment) {
      const projectId = comment.entityType === 'project'
        ? comment.entityId
        : await this.getProjectIdForEntity(comment.entityType, comment.entityId);

      if (projectId) {
        await this.collaborationService.broadcastChange(projectId, {
          entityType: 'comment',
          entityId: commentId,
          action: 'update',
          data: { ...comment, isResolved },
          userId,
          timestamp: new Date(),
        });
      }
    }

    return comment;
  }

  /**
   * Get comment count for an entity
   */
  async getCommentCount(entityType: string, entityId: string): Promise<number> {
    return this.commentRepository.getCommentCount(entityType, entityId);
  }

  /**
   * Helper method to get project ID for an entity
   * In a real implementation, this would query the appropriate tables
   */
  private async getProjectIdForEntity(entityType: string, entityId: string): Promise<string | null> {
    // This is a placeholder - in a real implementation, you would:
    // - For 'quantity': query quantities table to get project_id
    // - For 'cost_item': query cost_items table to get project_id
    // - For 'estimate': query cost_estimates table to get project_id
    // For now, we'll return null to avoid errors
    return null;
  }
}
