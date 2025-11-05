import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Milestone {
  id: number;
  title: string;
  targetAmount: number;
  isCompleted: boolean;
}

interface Project {
  id: number;
  title: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  milestones: Milestone[];
  isActive: boolean;
}

interface HomeProps {
  walletAddress: string;
}

const Home: React.FC<HomeProps> = ({ walletAddress }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: '',
    milestones: [{ title: '', description: '', targetAmount: '', requiredApprovals: '3' }],
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          targetAmount: parseInt(formData.targetAmount),
          milestones: formData.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            targetAmount: parseInt(m.targetAmount),
            requiredApprovals: parseInt(m.requiredApprovals),
          })),
        }),
      });

      if (response.ok) {
        alert('Project created successfully on-chain! This may take a few seconds...');
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          targetAmount: '',
          milestones: [{ title: '', description: '', targetAmount: '', requiredApprovals: '3' }],
        });
        fetchProjects();
      } else {
        const error = await response.json();
        alert('Error creating project: ' + error.error);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        { title: '', description: '', targetAmount: '', requiredApprovals: '3' },
      ],
    });
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData({ ...formData, milestones: newMilestones });
  };

  if (loading) {
    return <div style={styles.loading}>Loading projects...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Milestone-Based Crowdfunding</h1>
        <p style={styles.subtitle}>
          Support projects with transparent milestone releases on Stellar blockchain
        </p>
        <button style={styles.createButton} onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '✕ Cancel' : '+ Create New Project'}
        </button>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Create New Project</h2>
          <form onSubmit={handleCreateProject} style={styles.form}>
            <input
              type="text"
              placeholder="Project Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={styles.input}
              required
            />
            <textarea
              placeholder="Project Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ ...styles.input, minHeight: '100px' }}
              required
            />
            <input
              type="number"
              placeholder="Total Target Amount"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              style={styles.input}
              required
            />

            <h3 style={styles.milestonesHeader}>Milestones</h3>
            {formData.milestones.map((milestone, index) => (
              <div key={index} style={styles.milestoneGroup}>
                <h4 style={styles.milestoneLabel}>Milestone {index + 1}</h4>
                <input
                  type="text"
                  placeholder="Milestone Title"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Milestone Description"
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="number"
                  placeholder="Target Amount"
                  value={milestone.targetAmount}
                  onChange={(e) => updateMilestone(index, 'targetAmount', e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="number"
                  placeholder="Required Approvals"
                  value={milestone.requiredApprovals}
                  onChange={(e) => updateMilestone(index, 'requiredApprovals', e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            ))}
            <button type="button" onClick={addMilestone} style={styles.addMilestoneButton}>
              + Add Another Milestone
            </button>

            <button type="submit" style={styles.submitButton}>
              Create Project (On-Chain)
            </button>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div style={styles.projectsGrid}>
        {projects.length === 0 ? (
          <p style={styles.emptyState}>No projects yet. Create the first one!</p>
        ) : (
          projects.map((project) => (
            <Link key={project.id} to={`/project/${project.id}`} style={styles.projectCard}>
              <div style={styles.projectHeader}>
                <h3 style={styles.projectTitle}>{project.title}</h3>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: project.isActive ? '#10b981' : '#6b7280',
                  }}
                >
                  {project.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
              <p style={styles.projectDescription}>{project.description}</p>
              <div style={styles.progressSection}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min((project.raisedAmount / project.targetAmount) * 100, 100)}%`,
                    }}
                  />
                </div>
                <div style={styles.progressText}>
                  <span style={styles.raised}>{project.raisedAmount.toLocaleString()} raised</span>
                  <span style={styles.target}>of {project.targetAmount.toLocaleString()}</span>
                </div>
              </div>
              <div style={styles.milestoneCount}>
                📋 {project.milestones.length} milestones •{' '}
                {project.milestones.filter((m) => m.isCompleted).length} completed
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    fontSize: '1.2rem',
    color: 'white',
    padding: '3rem',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '3rem',
    color: 'white',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '1rem',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '2rem',
    opacity: 0.9,
  },
  createButton: {
    padding: '0.8rem 2rem',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '1.8rem',
    marginBottom: '1.5rem',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.8rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  milestonesHeader: {
    marginTop: '1rem',
    fontSize: '1.3rem',
    color: '#333',
  },
  milestoneGroup: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  milestoneLabel: {
    fontSize: '1rem',
    color: '#667eea',
    marginBottom: '0.5rem',
  },
  addMilestoneButton: {
    padding: '0.6rem',
    background: '#f3f4f6',
    color: '#667eea',
    border: '2px dashed #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
  },
  submitButton: {
    padding: '1rem',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  emptyState: {
    textAlign: 'center',
    color: 'white',
    fontSize: '1.2rem',
    padding: '3rem',
  },
  projectCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.8rem',
  },
  projectTitle: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    padding: '0.3rem 0.8rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'white',
  },
  projectDescription: {
    color: '#666',
    marginBottom: '1rem',
    lineHeight: '1.5',
  },
  progressSection: {
    marginBottom: '1rem',
  },
  progressBar: {
    height: '8px',
    background: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  },
  raised: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  target: {
    color: '#666',
  },
  milestoneCount: {
    fontSize: '0.9rem',
    color: '#666',
    marginTop: '0.5rem',
  },
};

export default Home;