import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  Project,
  CreateProjectRequest,
  PledgeRequest,
  ReleaseMilestoneRequest,
} from './types';
import {
  createCampaign,
  createMilestone,
  buildContributionParams,
  releaseMilestone,
  buildApproveMilestoneParams,
} from './stellar';

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple file-based storage
const DATA_FILE = path.join(__dirname, '../data/projects.json');

// Helper: Read projects from file
const readProjects = (): Project[] => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading projects:', error);
    return [];
  }
};

// Helper: Write projects to file
const writeProjects = (projects: Project[]): void => {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error writing projects:', error);
    throw error;
  }
};

// Routes

/**
 * GET /api/projects
 * List all projects
 */
app.get('/api/projects', (req: Request, res: Response) => {
  try {
    const projects = readProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:id
 * Get single project by ID
 */
app.get('/api/projects/:id', (req: Request, res: Response) => {
  try {
    const projects = readProjects();
    const project = projects.find((p) => p.id === parseInt(req.params.id));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * POST /api/projects
 * Create new project (creates campaign + milestones on-chain)
 */
app.post('/api/projects', async (req: Request, res: Response) => {
  try {
    const body: CreateProjectRequest = req.body;
    const { title, description, targetAmount, milestones } = body;

    // Validation
    if (!title || !description || !targetAmount || !milestones || milestones.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const projects = readProjects();
    const newId = projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1;

    // Use the creator address from env (for simplicity)
    const creator = process.env.CREATOR_ADDRESS || 'GDWA4326FKITATXTJFFKIOI66ZHU4MF7JJWH6L63LLOP2VHOJ2POOBIC';

    // Create campaign on-chain
    console.log('Creating campaign on-chain...');
    const txHash = await createCampaign(
      creator,
      title,
      description,
      targetAmount,
      milestones.length
    );

    // Create project object
    const newProject: Project = {
      id: newId,
      title,
      description,
      creator,
      targetAmount,
      raisedAmount: 0,
      milestones: milestones.map((m, idx) => ({
        id: idx + 1,
        title: m.title,
        description: m.description,
        targetAmount: m.targetAmount,
        releasedAmount: 0,
        isApproved: false,
        isCompleted: false,
        approvalCount: 0,
        requiredApprovals: m.requiredApprovals,
      })),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Create milestones on-chain
    console.log('Creating milestones on-chain...');
    for (let i = 0; i < newProject.milestones.length; i++) {
      const milestone = newProject.milestones[i];
      await createMilestone(
        newId,
        milestone.id,
        milestone.description,
        milestone.targetAmount,
        milestone.requiredApprovals
      );
    }

    projects.push(newProject);
    writeProjects(projects);

    res.status(201).json({
      project: newProject,
      txHash,
      message: 'Project created successfully on-chain',
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

/**
 * POST /api/projects/:id/pledge
 * Record pledge and return transaction params for client to sign via Freighter
 */
app.post('/api/projects/:id/pledge', (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const body: PledgeRequest = req.body;
    const { amount, backer } = body;

    if (!amount || !backer) {
      return res.status(400).json({ error: 'Missing amount or backer address' });
    }

    const projects = readProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.isActive) {
      return res.status(400).json({ error: 'Project is not active' });
    }

    // Update local state (optimistic)
    project.raisedAmount += amount;
    writeProjects(projects);

    // Build transaction params for client to sign
    const txParams = buildContributionParams(projectId, backer, amount);

    res.json({
      message: 'Pledge recorded. Sign transaction with Freighter.',
      txParams,
      updatedProject: project,
    });
  } catch (error: any) {
    console.error('Error processing pledge:', error);
    res.status(500).json({ error: error.message || 'Failed to process pledge' });
  }
});

/**
 * POST /api/projects/:id/approve
 * Return transaction params for client to approve milestone via Freighter
 */
app.post('/api/projects/:id/approve', (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const { milestoneId, backer } = req.body;

    if (!milestoneId || !backer) {
      return res.status(400).json({ error: 'Missing milestoneId or backer' });
    }

    const projects = readProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Update local state (optimistic)
    milestone.approvalCount += 1;
    if (milestone.approvalCount >= milestone.requiredApprovals) {
      milestone.isApproved = true;
    }
    writeProjects(projects);

    // Build transaction params
    const txParams = buildApproveMilestoneParams(projectId, milestoneId, backer);

    res.json({
      message: 'Approval recorded. Sign transaction with Freighter.',
      txParams,
      updatedMilestone: milestone,
    });
  } catch (error: any) {
    console.error('Error approving milestone:', error);
    res.status(500).json({ error: error.message || 'Failed to approve milestone' });
  }
});

/**
 * POST /api/projects/:id/release
 * Release milestone funds (server signs and submits transaction)
 */
app.post('/api/projects/:id/release', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const body: ReleaseMilestoneRequest = req.body;
    const { milestoneId, requester } = body;

    if (!milestoneId || !requester) {
      return res.status(400).json({ error: 'Missing milestoneId or requester' });
    }

    const projects = readProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const milestone = project.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    if (milestone.isCompleted) {
      return res.status(400).json({ error: 'Milestone already completed' });
    }

    if (!milestone.isApproved) {
      return res.status(400).json({ error: 'Milestone not approved by backers' });
    }

    // Release funds on-chain (server signs with SECRET_KEY)
    console.log('Releasing milestone on-chain...');
    const txHash = await releaseMilestone(projectId, milestoneId, requester);

    // Update local state
    milestone.isCompleted = true;
    milestone.releasedAmount = milestone.targetAmount;
    project.raisedAmount -= milestone.targetAmount;
    writeProjects(projects);

    res.json({
      message: 'Milestone released successfully',
      txHash,
      updatedMilestone: milestone,
      updatedProject: project,
    });
  } catch (error: any) {
    console.error('Error releasing milestone:', error);
    res.status(500).json({ error: error.message || 'Failed to release milestone' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});