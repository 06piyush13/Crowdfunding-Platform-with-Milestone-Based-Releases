// client/src/pages/Project.tsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { signTransaction, getPublicKey } from "../utils/freighter";

interface Milestone {
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

interface Project {
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

interface ProjectProps {
  walletAddress: string;
  walletConnected: boolean;
}

const Project: React.FC<ProjectProps> = ({ walletAddress, walletConnected }) => {
  const { id } = useParams<{ id?: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const data = await res.json();
      setProject(data);
    } catch (e) {
      console.error(e);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !walletAddress) {
      alert("Connect your Freighter wallet first.");
      return;
    }
    const amount = parseInt(pledgeAmount, 10);
    if (!amount || amount <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/projects/${id}/pledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, backer: walletAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to request pledge tx");
      }
      const data = await res.json();
      alert("Please sign the pledge transaction in Freighter.");
      const txHash = await signTransaction(data.txParams);
      alert(`Pledge submitted: ${txHash}`);
      setPledgeAmount("");
      fetchProject();
    } catch (err: any) {
      console.error(err);
      alert("Pledge failed: " + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (milestoneId: number) => {
    if (!walletConnected || !walletAddress) {
      alert("Connect your Freighter wallet first.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/projects/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, backer: walletAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get approval tx params");
      }
      const data = await res.json();
      alert("Please sign the approval transaction in Freighter.");
      const txHash = await signTransaction(data.txParams);
      alert(`Approval submitted: ${txHash}`);
      fetchProject();
    } catch (err: any) {
      console.error(err);
      alert("Approve failed: " + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const handleRelease = async (milestoneId: number) => {
    if (!walletConnected || !walletAddress) {
      alert("Connect your Freighter wallet first.");
      return;
    }
    if (!confirm("Release funds for this milestone?")) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/projects/${id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, requester: walletAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to release milestone");
      }
      const data = await res.json();
      alert(`Released on-chain tx: ${data.txHash}`);
      fetchProject();
    } catch (err: any) {
      console.error(err);
      alert("Release failed: " + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div style={{ color: "white", padding: 20 }}>Loading...</div>;
  if (!project) return <div style={{ color: "white", padding: 20 }}>Project not found</div>;

  const isCreator = walletAddress && project.creator === walletAddress;
  const progress = Math.min((project.raisedAmount / project.targetAmount) * 100, 100);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <Link to="/" style={{ color: "white", textDecoration: "none", marginBottom: 12, display: "inline-block" }}>
        ← Back
      </Link>

      <div style={{ background: "white", padding: 20, borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>{project.title}</h1>
          <span style={{ padding: "6px 10px", borderRadius: 8, color: "white", background: project.isActive ? "#10b981" : "#6b7280" }}>
            {project.isActive ? "Active" : "Closed"}
          </span>
        </div>

        <p style={{ color: "#444" }}>{project.description}</p>

        <div style={{ margin: "12px 0" }}>
          <div style={{ height: 12, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#667eea,#764ba2)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div><strong>{project.raisedAmount}</strong> raised</div>
            <div>of <strong>{project.targetAmount}</strong></div>
          </div>
        </div>

        {project.isActive && (
          <div style={{ background: "#f0f4ff", padding: 12, borderRadius: 8, marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Make a pledge</h3>
            <form onSubmit={handlePledge} style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min="1"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value)}
                placeholder="amount"
                style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                disabled={processing}
                required
              />
              <button type="submit" disabled={processing} style={{ padding: "8px 16px", borderRadius: 8, background: "#667eea", color: "white", border: "none" }}>
                {processing ? "Processing..." : "Pledge"}
              </button>
            </form>
          </div>
        )}

        <section style={{ marginTop: 18 }}>
          <h3>Milestones ({project.milestones.length})</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {project.milestones.map((m) => (
              <div key={m.id} style={{ padding: 12, borderRadius: 8, background: "#fafafa", border: "1px solid #eee" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{m.id}. {m.title}</strong>
                  <div>
                    {m.isCompleted ? (
                      <span style={{ color: "#10b981" }}>✓ Completed</span>
                    ) : m.isApproved ? (
                      <span style={{ color: "#3b82f6" }}>Approved</span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>Pending</span>
                    )}
                  </div>
                </div>
                <p style={{ margin: "8px 0" }}>{m.description}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div>Target: <strong>{m.targetAmount}</strong></div>
                    <div>Approvals: <strong>{m.approvalCount}/{m.requiredApprovals}</strong></div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!m.isCompleted && !m.isApproved && walletConnected && !isCreator && (
                      <button onClick={() => handleApprove(m.id)} disabled={processing} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white" }}>
                        Approve
                      </button>
                    )}

                    {!m.isCompleted && m.isApproved && isCreator && (
                      <button onClick={() => handleRelease(m.id)} disabled={processing} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#10b981", color: "white" }}>
                        Release Funds
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Project;
