import { loadDashboardSnapshot, loadDashboardWallet, loadDashboardDrivers, loadDashboardUsers } from '@/lib/admin-data';
import {
  TopExecutiveMetricCards,
  OrdersStatusBreakdownWidget,
  RidersFleetPanel,
  KycReviewQueueWidget,
  GeographicDistributionTable,
  RecentActivityAlertsFeed,
} from '@/components/dashboard-ops-widgets';
import { FinancialAnalyticsCard } from '@/components/financial-analytics-card';
import { TranscopeMapCard } from '@/components/transcope-map-card';
import { TranscopeTransactionsTable } from '@/components/transcope-transactions-table';

export default async function DashboardPage() {
  const [data, walletData, drivers, users] = await Promise.all([
    loadDashboardSnapshot(),
    loadDashboardWallet(),
    loadDashboardDrivers(),
    loadDashboardUsers(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Section 1: Top 5 Metric Cards Bar */}
      <section>
        <TopExecutiveMetricCards orders={data.recentOrders} drivers={drivers} users={users} />
      </section>

      {/* Section 2: Upper Main Grid (Financial Intelligence + Operations + Compact Map) */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Left Column: Financial Breakdown & Orders Lifecycle */}
        <div className="space-y-6">
          <FinancialAnalyticsCard walletStats={walletData.walletStats} />
          <OrdersStatusBreakdownWidget orders={data.recentOrders} />
        </div>

        {/* Right Column: Compact Live Vector Map & Riders Leaderboard */}
        <div className="space-y-6">
          <div className="h-[320px] w-full">
            <TranscopeMapCard orders={data.recentOrders} />
          </div>
          <RidersFleetPanel drivers={drivers} />
        </div>
      </div>

      {/* Section 3: Lower Grid (KYC Queue Preview + Recent Alerts Feed) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <KycReviewQueueWidget drivers={drivers} />
        <RecentActivityAlertsFeed />
      </div>

      {/* Section 4: Geographic Delivery Distribution Table */}
      <section>
        <GeographicDistributionTable />
      </section>

      {/* Section 5: Primary Financial Transactions Registry Table */}
      <section>
        <TranscopeTransactionsTable transactions={walletData.transactions} />
      </section>
    </div>
  );
}
