import { PerformanceDashboard } from '@client/components/agents/performance-dashboard';

export default function PerformancePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Performance Monitoring</h1>
      <PerformanceDashboard />
    </div>
  );
}
