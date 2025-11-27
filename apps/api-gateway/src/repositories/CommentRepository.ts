import { Knex } from 'knex';
import { Comment, CommentCreate, CommentUpdate } from '../models/Comment';

export class CommentRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  /**
   * Create a new comment
   */
  async create(userId: string, commentData: CommentCreate): Promise<Comment> {
    const [comment] = await this.db('comments')
      .insert({
        entity_type: commentData.entityType,
        entity_id: commentData.entityId,
        user_id: userId,
        content: commentData.content,
        parent_comment_id: commentData.parentCommentId || null,
        is_resolved: false,
      })
      .returning('*');

    return this.mapToComment(comment);
  }

  /**
   * Get a comment by ID
   */
  async findById(commentId: string): Promise<Comment | null> {
    const comment = await this.db('comments')
      .where({ id: commentId })
      .first();

    return comment ? this.mapToComment(comment) : null;
  }

  /**
   * Get all comments for an entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<Comment[]> {
    const comments = await this.db('comments')
      .where({
        entity_type: entityType,
        entity_id: entityId,
      })
      .orderBy('created_at', 'asc');

    return comments.map(this.mapToComment);
  }

  /**
   * Get all replies to a comment (threaded comments)
   */
  async findReplies(parentCommentId: string): Promise<Comment[]> {
    const replies = await this.db('comments')
      .where({ parent_comment_id: parentCommentId })
      .orderBy('created_at', 'asc');

    return replies.map(this.mapToComment);
  }

  /**
   * Get all top-level comments for an entity (no parent)
   */
  async findTopLevelComments(entityType: string, entityId: string): Promise<Comment[]> {
    const comments = await this.db('comments')
      .where({
        entity_type: entityType,
        entity_id: entityId,
        parent_comment_id: null,
      })
      .orderBy('created_at', 'asc');

    return comments.map(this.mapToComment);
  }

  /**
   * Update a comment
   */
  async update(commentId: string, updates: CommentUpdate): Promise<Comment | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
    }

    if (updates.isResolved !== undefined) {
      updateData.is_resolved = updates.isResolved;
    }

    const [comment] = await this.db('comments')
      .where({ id: commentId })
      .update(updateData)
      .returning('*');

    return comment ? this.mapToComment(comment) : null;
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string): Promise<boolean> {
    const deleted = await this.db('comments')
      .where({ id: commentId })
      .delete();

    return deleted > 0;
  }

  /**
   * Get comments by user
   */
  async findByUser(userId: string): Promise<Comment[]> {
    const comments = await this.db('comments')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return comments.map(this.mapToComment);
  }

  /**
   * Mark a comment as resolved
   */
  async markResolved(commentId: string, isResolved: boolean): Promise<Comment | null> {
    const [comment] = await this.db('comments')
      .where({ id: commentId })
      .update({
        is_resolved: isResolved,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return comment ? this.mapToComment(comment) : null;
  }

  /**
   * Get comment count for an entity
   */
  async getCommentCount(entityType: string, entityId: string): Promise<number> {
    const result = await this.db('comments')
      .where({
        entity_type: entityType,
        entity_id: entityId,
      })
      .count('* as count')
      .first();

    return parseInt(result?.count as string) || 0;
  }

  /**
   * Map database row to Comment model
   */
  private mapToComment(row: any): Comment {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      userId: row.user_id,
      content: row.content,
      parentCommentId: row.parent_comment_id,
      isResolved: row.is_resolved,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
