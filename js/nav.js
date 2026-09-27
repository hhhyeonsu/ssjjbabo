// WeatherWorks 전역 사이드바 및 상단바 네비게이션 렌더러

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  const menuGroups = [
    {
      group: "현장",
      items: [
        { name: "현장 관리", href: "index.html" },
        { name: "공사 물량·생산성 산정", href: "quantity.html" },
        { name: "구간별 관측지점", href: "stations.html" }
      ]
    },
    {
      group: "공사기간 산정",
      items: [
        { name: "작업일수 산정", href: "duration-workdays.html" },
        { name: "비작업일수 산정·예측정확도", href: "duration-weather.html" }
      ]
    },
    {
      group: "데이터·공정",
      items: [
        { name: "기상데이터 품질관리", href: "quality.html" },
        { name: "공정표 Import", href: "schedule.html" },
        { name: "데이터 관리", href: "data.html" },
        { name: "기상 판정 기준 · 공휴일", href: "admin.html" }
      ]
    }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div style="font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:0.05em; text-transform:uppercase;">WeatherWorks</div>
      <div style="font-size:18px; font-weight:800; color:#fff; margin-top:2px;">WeatherWorks</div>
      <div style="font-size:12px; color:#94a3b8; margin-top:2px;">건설공사 비작업일수 · 공사기간 산정</div>
    </div>
    <nav class="sidebar-nav">
      ${menuGroups.map(grp => `
        <div class="nav-group-title" style="font-size:11px; font-weight:700; color:#64748b; padding:12px 16px 4px 16px;">${grp.group}</div>
        ${grp.items.map(item => {
          const isActive = (currentPath === item.href) ? 'active' : '';
          return `
            <a href="${item.href}" class="nav-item ${isActive}">
              ${item.name}
            </a>
          `;
        }).join('')}
      `).join('')}
    </nav>
    <div style="padding:16px; font-size:11px; color:#64748b; border-top:1px solid rgba(255,255,255,0.08); margin-top:auto;">
      예상값이며 실제 작업 여부는 현장 상황 및 공식 기상 정보에 따라 달라질 수 있습니다.
    </div>
  `;
}

function renderTopbar(pageTitle = '') {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  topbar.innerHTML = `
    <div style="font-size:14px; font-weight:700; color:#1e293b;">${pageTitle}</div>
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:12px; color:#64748b;">시스템 상태: <strong style="color:#16a34a;">정상 가동중</strong></span>
    </div>
  `;
}