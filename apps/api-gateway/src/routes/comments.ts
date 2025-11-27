import { Router, Response } from 'express';
import { CommentService } from '../services/CommentService';
import { AuthRequest } from '../middleware/auth';
import { body, param, query, validationResult } from 'express-validator';

export function createCommentRouter(commentService: CommentService, authMiddleware: any): Router {
  const router = Router();

  // All comment routes require authentication
  router.use(authMiddleware);

  /**
   * @swagger
   * /api/comments:
   *   post:
   *     summary: Add a comment to an entity
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - entityType
   *               - entityId
   *               - content
   *             properties:
   *               entityType:
   *                 type: string
   *                 enum: [project, quantity, cost_item, estimate]
   *               entityId:
   *                 type: string
   *                 format: uuid
   *               content:
   *                 type: string
   *               parentCommentId:
   *                 type: string
   *                 format: uuid
   *     responses:
   *       201:
   *         description: Comment created successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/',
    [
      body('entityType').isIn(['project', 'quantity', 'cost_item', 'estimate']),
      body('entityId').isUUID(),
      body('content').isString().trim().notEmpty().isLength({ min: 1, max: 5000 }),
      body('parentCommentId').optional().isUUID(),
    ],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.user!.userId;
        const comment = await commentService.addComment(userId, req.body);

        return res.status(201).json(comment);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/comments/{entityType}/{entityId}:
   *   get:
   *     summary: Get all comments for an entity
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: entityType
   *         required: true
   *         schema:
   *           type: string
   *           enum: [project, quantity, cost_item, estimate]
   *       - in: path
   *         name: entityId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: threaded
   *         schema:
   *           type: boolean
   *         description: Return comments in threaded format with replies
   *     responses:
   *       200:
   *         description: List of comments
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/:entityType/:entityId',
    [
      param('entityType').isIn(['project', 'quantity', 'cost_item', 'estimate']),
      param('entityId').isUUID(),
      query('threaded').optional().isBoolean(),
    ],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { entityType, entityId } = req.params;
        const threaded = req.query.threaded === 'true';

        const comments = threaded
          ? await commentService.getThreadedComments(entityType, entityId)
          : await commentService.getComments(entityType, entityId);

        return res.json(comments);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/comments/{commentId}:
   *   get:
   *     summary: Get a specific comment
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Comment details
   *       404:
   *         description: Comment not found
   *       401:
   *         description: Unauthorized
   */
  router.get(
    '/:commentId',
    [param('commentId').isUUID()],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const comment = await commentService.getComment(req.params.commentId);

        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        return res.json(comment);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/comments/{commentId}:
   *   patch:
   *     summary: Update a comment
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content:
   *                 type: string
   *               isResolved:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Comment updated successfully
   *       404:
   *         description: Comment not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - not the comment owner
   */
  router.patch(
    '/:commentId',
    [
      param('commentId').isUUID(),
      body('content').optional().isString().trim().notEmpty().isLength({ min: 1, max: 5000 }),
      body('isResolved').optional().isBoolean(),
    ],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.user!.userId;
        const comment = await commentService.updateComment(req.params.commentId, userId, req.body);

        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        return res.json(comment);
      } catch (error: any) {
        if (error.message === 'Unauthorized to update this comment') {
          return res.status(403).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/comments/{commentId}:
   *   delete:
   *     summary: Delete a comment
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Comment deleted successfully
   *       404:
   *         description: Comment not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - not the comment owner
   */
  router.delete(
    '/:commentId',
    [param('commentId').isUUID()],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.user!.userId;
        const deleted = await commentService.deleteComment(req.params.commentId, userId);

        if (!deleted) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        return res.status(204).send();
      } catch (error: any) {
        if (error.message === 'Unauthorized to delete this comment') {
          return res.status(403).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/comments/{commentId}/resolve:
   *   post:
   *     summary: Mark a comment as resolved or unresolved
   *     tags: [Comments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: commentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - isResolved
   *             properties:
   *               isResolved:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Comment resolution status updated
   *       404:
   *         description: Comment not found
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/:commentId/resolve',
    [
      param('commentId').isUUID(),
      body('isResolved').isBoolean(),
    ],
    async (req: AuthRequest, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.user!.userId;
        const comment = await commentService.markResolved(
          req.params.commentId,
          userId,
          req.body.isResolved
        );

        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        return res.json(comment);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
}
