import {
  BarChart3, Bell, Boxes, CalendarDays, ChartNoAxesCombined, CircleCheck,
  ClipboardList, CreditCard, LayoutDashboard, Package, Search, Settings2,
  ShoppingBag, TrendingUp,
} from "lucide-react";
import FluxHubLogo from "@/components/fluxhub-logo";

/**
 * Purely illustrative login background. These are not real seller metrics,
 * and the entire decoration is hidden from assistive technologies.
 * No API calls, timers, large chart libraries or animation JavaScript.
 */
export default function LoginAnimatedDashboard() {
  const navigation = [
    { label: "Dashboard", Icon: LayoutDashboard, active: true },
    { label: "Pedidos", Icon: ClipboardList },
    { label: "Produtos", Icon: Package },
    { label: "Vendas", Icon: ShoppingBag },
    { label: "Financeiro", Icon: CreditCard },
    { label: "Relatórios", Icon: BarChart3 },
    { label: "Integrações", Icon: Boxes },
    { label: "Configurações", Icon: Settings2 },
  ];
  const metrics = [
    { label: "Vendas", value: "R$ 47.892,30", delta: "+18,4%", Icon: CreditCard },
    { label: "Pedidos", value: "1.284", delta: "+12,7%", Icon: ClipboardList },
    { label: "Anúncios", value: "3.421", delta: "+6,9%", Icon: Package },
  ];
  const bars = [30, 46, 39, 62, 48, 37, 57, 74, 46, 63, 83, 71];

  return <div className="login-scene" aria-hidden="true">
    <div className="login-scene-glow login-scene-glow-one" />
    <div className="login-scene-glow login-scene-glow-two" />
    <div className="login-scene-shell">
      <aside className="login-scene-sidebar">
        <FluxHubLogo className="scene-logo" />
        <nav className="scene-navigation">
          {navigation.map(({ label, Icon, active }) =>
            <div key={label} className={active ? "scene-nav active" : "scene-nav"}>
              <Icon size={17}/><span>{label}</span>
            </div>
          )}
        </nav>
        <div className="scene-sidebar-bottom">
          <CircleCheck size={16}/> Visão integrada
        </div>
      </aside>
      <div className="login-scene-main">
        <div className="scene-dashboard-head">
          <div>
            <span className="scene-eyebrow">PRÉVIA ILUSTRATIVA</span>
            <h2>Dashboard</h2>
            <p>Visão geral da sua operação no Mercado Livre.</p>
          </div>
          <div className="scene-period"><CalendarDays size={15}/> Últimos 30 dias</div>
        </div>
        <div className="scene-metrics">
          {metrics.map(({ label, value, delta, Icon }) =>
            <div className="scene-tile" key={label}>
              <span className="scene-tile-icon"><Icon size={20}/></span>
              <span className="scene-tile-label">{label}</span>
              <strong>{value}</strong>
              <span className="scene-up"><TrendingUp size={13}/>{delta}</span>
            </div>
          )}
        </div>
        <div className="scene-content">
          <div className="scene-chart">
            <div className="scene-panel-heading">
              <h3>Faturamento por período</h3><ChartNoAxesCombined size={17}/>
            </div>
            <div className="scene-chart-area">
              <span className="scene-axis-label scene-axis-top">60k</span>
              <span className="scene-axis-label scene-axis-mid">30k</span>
              <span className="scene-axis-label scene-axis-bottom">0</span>
              <div className="scene-grid-lines"><i/><i/><i/><i/></div>
              <svg className="scene-line-chart" viewBox="0 0 600 210" preserveAspectRatio="none" focusable="false">
                <defs>
                  <linearGradient id="login-chart-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#149cff" stopOpacity=".32" />
                    <stop offset="1" stopColor="#149cff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 179 L55 145 L110 156 L165 122 L220 130 L275 91 L330 99 L385 60 L440 68 L495 45 L550 55 L600 15 L600 210 L0 210 Z" fill="url(#login-chart-area)" />
                <path className="scene-chart-stroke" d="M0 179 L55 145 L110 156 L165 122 L220 130 L275 91 L330 99 L385 60 L440 68 L495 45 L550 55 L600 15" fill="none" stroke="#37c1ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <circle className="scene-chart-dot" cx="385" cy="60" r="7" fill="#ffffff" stroke="#2099ff" strokeWidth="4" />
                <circle className="scene-chart-dot dot-delay" cx="600" cy="15" r="7" fill="#ffffff" stroke="#2099ff" strokeWidth="4" />
              </svg>
            </div>
            <div className="scene-chart-labels"><span>01 jan</span><span>10 jan</span><span>20 jan</span><span>30 jan</span></div>
          </div>
          <div className="scene-integrations">
            <div className="scene-panel-heading"><h3>Vendas por canal</h3><Search size={16}/></div>
            <div className="scene-donut">
              <span>R$ 47.892<small>Total</small></span>
            </div>
            <div className="scene-legend">
              <span><i/> Mercado Livre <b>62%</b></span>
              <span><i/> Outros canais <b>38%</b></span>
            </div>
          </div>
        </div>
        <div className="scene-bottom">
          <div className="scene-chart scene-bars-panel">
            <div className="scene-panel-heading"><h3>Pedidos por dia</h3><BarChart3 size={17}/></div>
            <div className="scene-bars">
              {bars.map((height, i) =>
                <span key={i} style={{ height: height + "%", animationDelay: i * 85 + "ms" }} />
              )}
            </div>
          </div>
          <div className="scene-chart scene-status-panel">
            <div className="scene-panel-heading"><h3>Status dos pedidos</h3><Bell size={17}/></div>
            <div className="scene-status-row"><i/> Entregues <b>78%</b></div>
            <div className="scene-status-row"><i/> Em transporte <b>15%</b></div>
            <div className="scene-status-row"><i/> Em separação <b>7%</b></div>
          </div>
        </div>
      </div>
    </div>
    <svg className="login-scene-waves" viewBox="0 0 1600 900" preserveAspectRatio="none" focusable="false">
      <path d="M-100 755 C220 550 295 960 615 788 C940 585 1040 780 1270 590 C1410 460 1510 510 1720 455" />
      <path d="M-100 800 C250 620 355 1000 675 850 C925 735 1165 650 1740 805" />
      <circle cx="610" cy="791" r="5" />
      <circle cx="1320" cy="571" r="5" />
    </svg>
  </div>;
}
