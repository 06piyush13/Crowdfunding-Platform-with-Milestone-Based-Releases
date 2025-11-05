// Shared types for the application

export interface Milestone {
  id: number;
  title: string;
  description: string;
  targetAmount: number;
  releasedAmount: number;
  isApproved: boolean;
  isCompleted: boolean;
  approvalCount: number;
  requiredApprovals: number;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  creator: string;
  targetAmount: number;
  raisedAmount: number;
  milestones: Milestone[];
  isActive: boolean;
  createdAt: string;
}

export interface PledgeRequest {
  amount: number;
  backer: string;
}

export interface ReleaseMilestoneRequest {
  milestoneId: number;
  requester: string;
}

export interface CreateProjectRequest {
  title: string;
  description: string;
  targetAmount: number;
  milestones: Array<{
    title: string;
    description: string;
    targetAmount: number;
    requiredApprovals: number;
  }>;
}