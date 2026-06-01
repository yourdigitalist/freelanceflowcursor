import DashboardZoom, { DASHBOARD_ZOOM_SRC } from "@/components/landing/DashboardZoom";
import "@/styles/dashboard-zoom.css";
import "@/styles/landing-showcase.css";

export default function LandingShowcaseProjectOverview() {
  return (
    <section className="landing-showcase-section">
      <div className="landing-showcase-divider" />
      <div className="landing-showcase-item">
        <div className="landing-showcase-text">
          <span className="landing-section-label">✦ Project overview</span>
          <h3>Your entire business at a glance</h3>
          <p>
            The Lance dashboard gives you an instant read on what&apos;s happening — active
            projects, hours logged, pending payments, and upcoming tasks — without hunting across
            multiple tools.
          </p>
          <ul className="landing-showcase-points">
            <li>Active clients and projects in one view</li>
            <li>Hours this month, rates, and due dates</li>
            <li>Quick actions to log time or send invoices</li>
            <li>Follow-ups and recent activity feed</li>
          </ul>
        </div>
        <div className="landing-showcase-img">
          <DashboardZoom src={DASHBOARD_ZOOM_SRC} />
        </div>
      </div>
      <div className="landing-showcase-divider" />
    </section>
  );
}
