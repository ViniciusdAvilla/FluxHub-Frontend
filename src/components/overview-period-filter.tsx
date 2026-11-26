"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { periodSearchParams, type ReportPeriod } from "@/lib/report-period";
import ReportPeriodFilter from "./report-period-filter";

export default function OverviewPeriodFilter({ period, today, accountId, accounts, allowAll }: {
  period: ReportPeriod;
  today: string;
  accountId: number | null;
  accounts: { account_id: number; nickname: string | null }[];
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(value: ReportPeriod, account: string) {
    const params = periodSearchParams(value);
    if (account) params.set("account", account);
    router.push(pathname + "?" + params + window.location.hash, { scroll: false });
  }

  return <div className="fh-glass-period-group">
    {accounts.length > 1 && <label className="fh-glass-period">
      <select aria-label="Conta Mercado Livre" value={accountId === null ? "" : String(accountId)}
        onChange={event => navigate(period, event.target.value)}>
        <option value="">Todas as contas</option>
        {accounts.map(account => <option key={account.account_id} value={account.account_id}>
          {account.nickname || account.account_id}
        </option>)}
      </select>
      <ChevronDown size={15} aria-hidden />
    </label>}
    <ReportPeriodFilter period={period} today={today} allowAll={allowAll}
      onApply={value => navigate(value, accountId === null ? "" : String(accountId))}/>
  </div>;
}
