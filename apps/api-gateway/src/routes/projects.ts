import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ProjectService } from '../services/ProjectService';
import { ProjectCreate, ProjectUpdate, ProjectTeamMemberCreate } from '../models/Project';

export const createProjectRouter = (projectService: ProjectService): Router => {
  const router = Router();

  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - location
   *               - startDate
   *               - status
   *               - organizationId
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               location:
   *                 type: object
   *                 properties:
   *                   address:
   *                     type: string
   *                   city:
   *                     type: string
   *                   region:
   *                     type: string
   *                   country:
   *                     type: string
   *                   coordinates:
   *                     type: object
   *                     properties:
   *                       lat:
   *                         type: number
   *                       lng:
   *                         type: number
   *               clientName:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *               organizationId:
   *                 type: string
   *               createdBy:
   *                 type: string
   *     responses:
   *       201:
   *         description: Project created successfully
   *       400:
   *         description: Invalid input data
   *       500:
   *         description: Server error
   */
  router.post(
    '/',
    [
      body('name').trim().notEmpty().withMessage('Project name is required'),
      body('location').isObject().withMessage('Location must be an object'),
      body('location.address').trim().notEmpty().withMessage('Location address is required'),
      body('location.city').trim().notEmpty().withMessage('Location city is required'),
      body('location.region').trim().notEmpty().withMessage('Location region is required'),
      body('location.country').trim().notEmpty().withMessage('Location country is required'),
      body('startDate').isISO8601().withMessage('Valid start date is required'),
      body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
      body('status')
        .isIn(['planning', 'active', 'on_hold', 'completed', 'archived'])
        .withMessage('Invalid status'),
      body('organizationId').trim().notEmpty().withMessage('Organization ID is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const projectData: ProjectCreate = {
          name: req.body.name,
          description: req.body.description,
          location: req.body.location,
          clientName: req.body.clientName,
          startDate: new Date(req.body.startDate),
          endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
          status: req.body.status,
          organizationId: req.body.organizationId,
          createdBy: req.body.createdBy,
        };

        const project = await projectService.createProject(projectData);
        res.status(201).json(project);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects:
   *   get:
   *     summary: Get all projects with optional filtering
   *     tags: [Projects]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [planning, active, on_hold, completed, archived]
   *         description: Filter by project status
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         description: Filter by organization ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter by user access
   *     responses:
   *       200:
   *         description: List of projects
   *       500:
   *         description: Server error
   */
  router.get(
    '/',
    [
      query('status')
        .optional()
        .isIn(['planning', 'active', 'on_hold', 'completed', 'archived'])
        .withMessage('Invalid status'),
      query('organizationId').optional().trim(),
      query('userId').optional().trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const filters: any = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.organizationId) filters.organizationId = req.query.organizationId;
        if (req.query.userId) filters.userId = req.query.userId;

        const projects = await projectService.getProjects(filters);
        res.json(projects);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}:
   *   get:
   *     summary: Get a project by ID
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User ID for access verification
   *     responses:
   *       200:
   *         description: Project details
   *       404:
   *         description: Project not found
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.get(
    '/:id',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.query.userId as string | undefined;
        const project = await projectService.getProject(req.params.id, userId);
        res.json(project);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied to this project') {
          return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}:
   *   put:
   *     summary: Update a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User ID for access verification
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               location:
   *                 type: object
   *               clientName:
   *                 type: string
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               status:
   *                 type: string
   *                 enum: [planning, active, on_hold, completed, archived]
   *     responses:
   *       200:
   *         description: Project updated successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.put(
    '/:id',
    [
      param('id').trim().notEmpty().withMessage('Project ID is required'),
      body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty'),
      body('location').optional().isObject().withMessage('Location must be an object'),
      body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
      body('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
      body('status')
        .optional()
        .isIn(['planning', 'active', 'on_hold', 'completed', 'archived'])
        .withMessage('Invalid status'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const updateData: ProjectUpdate = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.location !== undefined) updateData.location = req.body.location;
        if (req.body.clientName !== undefined) updateData.clientName = req.body.clientName;
        if (req.body.startDate !== undefined) updateData.startDate = new Date(req.body.startDate);
        if (req.body.endDate !== undefined) updateData.endDate = new Date(req.body.endDate);
        if (req.body.status !== undefined) updateData.status = req.body.status;

        const userId = req.query.userId as string | undefined;
        const project = await projectService.updateProject(req.params.id, updateData, userId);
        res.json(project);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied to this project') {
          return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/archive:
   *   post:
   *     summary: Archive a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User ID for access verification
   *     responses:
   *       200:
   *         description: Project archived successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.post(
    '/:id/archive',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.query.userId as string | undefined;
        const project = await projectService.archiveProject(req.params.id, userId);
        res.json(project);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied to this project') {
          return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}:
   *   delete:
   *     summary: Delete a project (hard delete)
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User ID for access verification
   *     responses:
   *       204:
   *         description: Project deleted successfully
   *       404:
   *         description: Project not found
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.delete(
    '/:id',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.query.userId as string | undefined;
        await projectService.deleteProject(req.params.id, userId);
        res.status(204).send();
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied to this project') {
          return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/team:
   *   post:
   *     summary: Assign a team member to a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - role
   *             properties:
   *               userId:
   *                 type: string
   *               role:
   *                 type: string
   *                 enum: [owner, manager, surveyor, viewer]
   *               assignedBy:
   *                 type: string
   *     responses:
   *       201:
   *         description: Team member assigned successfully
   *       400:
   *         description: Invalid input or user already on project
   *       404:
   *         description: Project not found
   *       500:
   *         description: Server error
   */
  router.post(
    '/:id/team',
    [
      param('id').trim().notEmpty().withMessage('Project ID is required'),
      body('userId').trim().notEmpty().withMessage('User ID is required'),
      body('role')
        .isIn(['owner', 'manager', 'surveyor', 'viewer'])
        .withMessage('Invalid role'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const teamMemberData: ProjectTeamMemberCreate = {
          projectId: req.params.id,
          userId: req.body.userId,
          role: req.body.role,
          assignedBy: req.body.assignedBy,
        };

        const teamMember = await projectService.assignTeamMember(teamMemberData);
        res.status(201).json(teamMember);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'User is already a member of this project') {
          return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/team/{userId}:
   *   delete:
   *     summary: Remove a team member from a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID to remove
   *     responses:
   *       204:
   *         description: Team member removed successfully
   *       404:
   *         description: Project not found or user not on project
   *       500:
   *         description: Server error
   */
  router.delete(
    '/:id/team/:userId',
    [
      param('id').trim().notEmpty().withMessage('Project ID is required'),
      param('userId').trim().notEmpty().withMessage('User ID is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        await projectService.removeTeamMember(req.params.id, req.params.userId);
        res.status(204).send();
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Failed to remove team member or user not found on project') {
          return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/team:
   *   get:
   *     summary: Get team members for a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: List of team members
   *       404:
   *         description: Project not found
   *       500:
   *         description: Server error
   */
  router.get(
    '/:id/team',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const teamMembers = await projectService.getTeamMembers(req.params.id);
        res.json(teamMembers);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/statistics:
   *   get:
   *     summary: Get project statistics for dashboard
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Project statistics
   *       404:
   *         description: Project not found
   *       500:
   *         description: Server error
   */
  router.get(
    '/:id/statistics',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const statistics = await projectService.getProjectStatistics(req.params.id);
        res.json(statistics);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/versions:
   *   get:
   *     summary: Get version history for a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: List of version history entries
   *       404:
   *         description: Project not found
   *       500:
   *         description: Server error
   */
  router.get(
    '/:id/versions',
    [param('id').trim().notEmpty().withMessage('Project ID is required')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const versions = await projectService.getVersionHistory(req.params.id);
        res.json(versions);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Version history not enabled') {
          return res.status(501).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/versions/{versionNumber}:
   *   get:
   *     summary: Get a specific version of a project
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: path
   *         name: versionNumber
   *         required: true
   *         schema:
   *           type: integer
   *         description: Version number
   *     responses:
   *       200:
   *         description: Version history entry
   *       404:
   *         description: Project or version not found
   *       500:
   *         description: Server error
   */
  router.get(
    '/:id/versions/:versionNumber',
    [
      param('id').trim().notEmpty().withMessage('Project ID is required'),
      param('versionNumber').isInt({ min: 1 }).withMessage('Valid version number is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const version = await projectService.getProjectVersion(
          req.params.id,
          parseInt(req.params.versionNumber)
        );
        if (!version) {
          return res.status(404).json({ error: 'Version not found' });
        }
        res.json(version);
      } catch (error: any) {
        if (error.message === 'Project not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Version history not enabled') {
          return res.status(501).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * @swagger
   * /api/projects/{id}/versions/{versionNumber}/restore:
   *   post:
   *     summary: Restore a project to a previous version
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *       - in: path
   *         name: versionNumber
   *         required: true
   *         schema:
   *           type: integer
   *         description: Version number to restore
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User ID for access verification
   *     responses:
   *       200:
   *         description: Project restored successfully
   *       404:
   *         description: Project or version not found
   *       403:
   *         description: Access denied
   *       500:
   *         description: Server error
   */
  router.post(
    '/:id/versions/:versionNumber/restore',
    [
      param('id').trim().notEmpty().withMessage('Project ID is required'),
      param('versionNumber').isInt({ min: 1 }).withMessage('Valid version number is required'),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const userId = req.query.userId as string | undefined;
        const restoredProject = await projectService.restoreProjectVersion(
          req.params.id,
          parseInt(req.params.versionNumber),
          userId
        );
        res.json(restoredProject);
      } catch (error: any) {
        if (error.message === 'Project not found' || error.message === 'Version not found') {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Access denied to this project') {
          return res.status(403).json({ error: error.message });
        }
        if (error.message === 'Version history not enabled') {
          return res.status(501).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
}