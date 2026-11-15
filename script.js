/* ============================================================================
   Bantay Map Prototype — Project BantayRiles
   Extracted Application Logic (script.js)
   ============================================================================ */

(function () {
  'use strict';

  // Georeferenced PNR IPC Southern Corridor Polyline (in % of 1000x625 viewBox)
  const TRACK_WAYPOINTS = [
    { x: 6.2, y: 12.16 },  // 1. Calamba
    { x: 13.8, y: 22.72 }, // 2. Pansol
    { x: 16.8, y: 24.64 }, // 3. Masili
    { x: 21.0, y: 23.68 }, // 4. Los Baños
    { x: 24.2, y: 25.28 }, // 5. College
    { x: 27.8, y: 26.24 }, // 6. IRRI (Bay)
    { x: 34.8, y: 53.12 }, // 7. San Pablo
    { x: 46.5, y: 62.08 }, // 8. Tiaong
    { x: 60.5, y: 65.92 }, // 9. Candelaria
    { x: 69.2, y: 68.48 }, // 10. Lutucan
    { x: 76.8, y: 71.68 }, // 11. Sariaya
    { x: 88.2, y: 77.12 }  // 12. Lucena
  ];

  function buildTrackMetrics(points) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.hypot(dx, dy);
      segs.push({ a: points[i], b: points[i + 1], len, startDist: total });
      total += len;
    }
    return { segs, total };
  }

  const TRACK_METRICS = buildTrackMetrics(TRACK_WAYPOINTS);

  function pointAtDistance(dist) {
    const clamped = Math.max(0, Math.min(TRACK_METRICS.total, dist));
    for (const seg of TRACK_METRICS.segs) {
      if (clamped <= seg.startDist + seg.len) {
        const t = seg.len === 0 ? 0 : (clamped - seg.startDist) / seg.len;
        return {
          x: seg.a.x + (seg.b.x - seg.a.x) * t,
          y: seg.a.y + (seg.b.y - seg.a.y) * t
        };
      }
    }
    return TRACK_WAYPOINTS[TRACK_WAYPOINTS.length - 1];
  }

  function snapToTrack(px, py) {
    let best = { x: px, y: py, distAlong: 0, perpDist: Infinity };
    for (const seg of TRACK_METRICS.segs) {
      const vx = seg.b.x - seg.a.x;
      const vy = seg.b.y - seg.a.y;
      const lenSq = vx * vx + vy * vy;
      let t = lenSq === 0 ? 0 : ((px - seg.a.x) * vx + (py - seg.a.y) * vy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = seg.a.x + t * vx;
      const projY = seg.a.y + t * vy;
      const d = Math.hypot(px - projX, py - projY);
      if (d < best.perpDist) {
        best = {
          x: Number(projX.toFixed(2)),
          y: Number(projY.toFixed(2)),
          distAlong: seg.startDist + t * seg.len,
          perpDist: d
        };
      }
    }
    return best;
  }

  const DEFAULT_STATE = {
    selectedNodeId: 'BP-01',
    showHotspots: true,
    editPinsMode: false,
    activeDbTab: 'crossing_nodes',
    customMapDataUrl: null,
    nodes: [
      {
        id: 'BP-01',
        shortName: 'Spot 1',
        name: 'Bantay Post 01 — Brgy. San Nicolas (North)',
        coordsText: '14.0792° N, 121.3185° E • KM 87.4 PNR IPC',
        xPct: 33.4,
        yPct: 47.0,
        status: 'CLEAR',
        shadowMode: false,
        etaSec: null,
        holdRemainingSec: 0,
        sensors: { cam: false, vib: false, radarKmh: 0 },
        batteryV: 13.3,
        solarW: 68,
        tamperAlert: false,
        marshal: { name: 'R. Manalo (BDRRMC San Nicolas)', phone: '+63 917 555 0142', shift: '06:00–18:00' }
      },
      {
        id: 'BP-02',
        shortName: 'Spot 2',
        name: 'Bantay Post 02 — Brgy. San Rafael (South)',
        coordsText: '14.0584° N, 121.3340° E • KM 89.9 PNR IPC',
        xPct: 36.8,
        yPct: 54.6,
        status: 'CLEAR',
        shadowMode: false,
        etaSec: null,
        holdRemainingSec: 0,
        sensors: { cam: false, vib: false, radarKmh: 0 },
        batteryV: 13.2,
        solarW: 64,
        tamperAlert: false,
        marshal: { name: 'J. Reyes (BDRRMC San Rafael)', phone: '+63 918 442 8890', shift: '06:00–18:00' }
      }
    ],
    incidents: [
      {
        id: 'INC-104',
        sector: 'Spot 1 (San Nicolas)',
        type: 'STONING',
        role: 'PNR Train Crew',
        time: '16:12 PST',
        xPct: 33.1,
        yPct: 45.8,
        message: 'Two youths spotted throwing ballast stones near Km 87.2 approach curve; directional Tagalog warning triggered.'
      },
      {
        id: 'INC-103',
        sector: 'Spot 2 (San Rafael)',
        type: 'DEBRIS',
        role: 'BDRRMC Official',
        time: '14:40 PST',
        xPct: 37.2,
        yPct: 55.2,
        message: 'Sacks of household waste dumped beside rail drainage culvert; cleared by barangay SWM team.'
      },
      {
        id: 'INC-102',
        sector: 'Mid-Sector (San Pablo–Tiaong)',
        type: 'STONING',
        role: 'Riles Marshal',
        time: 'Yesterday',
        xPct: 39.4,
        yPct: 66.7,
        message: 'Evening northbound train crew reported stone impact on coach #2 window near barangay footbridge.'
      }
    ],
    telemetryLogs: [
      { id: 'TL-902', nodeId: 'BP-02', time: '08:15:10', cam: 0, vib: 0, radar: 0, speed: 0, action: 'HEARTBEAT_OK' },
      { id: 'TL-901', nodeId: 'BP-01', time: '08:15:02', cam: 0, vib: 0, radar: 0, speed: 0, action: 'HEARTBEAT_OK' }
    ],
    smsLogs: [
      { id: 'SMS-41', nodeId: 'BP-01', marshal: 'R. Manalo', category: 'SHIFT_SYNC', sentAt: '06:00:05', ackSec: 38, status: 'ACKNOWLEDGED' }
    ],
    eventFeed: [
      { time: '08:15:10', tag: 'SYNC', text: 'GSM heartbeat received from BP-01 & BP-02 (13.3V / 13.2V).' },
      { time: '06:00:05', tag: 'SMS', text: 'Morning shift schedule synced to Riles Marshals R. Manalo & J. Reyes.' }
    ],
    activeMarshalAlert: null
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  let appState = deepClone(DEFAULT_STATE);
  appState.nodes.forEach((n) => {
    const snapped = snapToTrack(n.xPct, n.yPct);
    n.xPct = snapped.x;
    n.yPct = snapped.y;
  });

  // Simulation Controller
  const simController = {
    running: false,
    rafId: null,
    holdTimers: {},
    marshalTickInterval: null
  };

  // Rollback Checkpoint Engine
  const STORAGE_KEY = 'bantay_map_v6_1_georef_checkpoints';
  const RollbackEngine = {
    checkpoints: [],
    init() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          this.checkpoints = JSON.parse(saved);
        }
      } catch (e) {
        this.checkpoints = [];
      }
      if (!this.checkpoints.length) {
        this.checkpoints = [
          {
            id: 'cp-v6-1',
            label: 'v6.1 — Georeferenced Corridor Baseline',
            timestamp: new Date().toLocaleTimeString(),
            state: deepClone(appState)
          }
        ];
        this.persist();
      }
      this.renderSelect();
    },
    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.checkpoints));
      } catch (e) {}
    },
    save(label) {
      const cp = {
        id: 'cp-' + Date.now(),
        label: label || `Snapshot @ ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toLocaleTimeString(),
        state: deepClone(appState)
      };
      this.checkpoints.unshift(cp);
      if (this.checkpoints.length > 12) this.checkpoints.pop();
      this.persist();
      this.renderSelect();
      appendLog('DEV', `Saved checkpoint "${cp.label}".`);
    },
    rollback(id) {
      const target = this.checkpoints.find((c) => c.id === id);
      if (!target) return;
      stopSimulation();
      appState = deepClone(target.state);
      applyMapImageState();
      renderAll();
      appendLog('ROLLBACK', `Reverted dashboard to "${target.label}".`);
    },
    renderSelect() {
      const sel = document.getElementById('checkpointSelect');
      if (!sel) return;
      sel.innerHTML = this.checkpoints
        .map((c) => `<option value="${c.id}">${c.label}</option>`)
        .join('');
    }
  };

  function nowTimeStr() {
    return new Date().toTimeString().slice(0, 8);
  }

  function appendLog(tag, text) {
    appState.eventFeed.unshift({ time: nowTimeStr(), tag, text });
    if (appState.eventFeed.length > 30) appState.eventFeed.pop();
    renderEventLog();
  }

  function renderEventLog() {
    const container = document.getElementById('eventLogList');
    if (!container) return;
    if (!appState.eventFeed.length) {
      container.innerHTML = `<div class="p-3 text-slate-400 text-center">No telemetry events recorded.</div>`;
      return;
    }
    container.innerHTML = appState.eventFeed
      .map(
        (item) => `
        <div class="px-3.5 py-2 flex items-start gap-2 hover:bg-slate-50">
          <span class="text-slate-400 shrink-0">${item.time}</span>
          <span class="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px] shrink-0">${item.tag}</span>
          <span class="text-slate-700 leading-snug">${item.text}</span>
        </div>`
      )
      .join('');
  }

  // Zoom & Pan Controller
  const viewportState = { scale: 1, tx: 0, ty: 0, dragging: false, startX: 0, startY: 0 };

  function updateStageTransform() {
    const stage = document.getElementById('corridorMapStage');
    const readout = document.getElementById('zoomReadout');
    if (stage) {
      stage.style.transform = `translate(${viewportState.tx}px, ${viewportState.ty}px) scale(${viewportState.scale})`;
    }
    if (readout) {
      readout.textContent = `${Math.round(viewportState.scale * 100)}%`;
    }
  }

  function setZoom(nextScale) {
    const clamped = Math.max(1, Math.min(2.6, nextScale));
    viewportState.scale = clamped;
    if (clamped === 1) {
      viewportState.tx = 0;
      viewportState.ty = 0;
    }
    updateStageTransform();
  }

  function initZoomPan() {
    const vp = document.getElementById('mapViewport');
    document.getElementById('btnZoomIn').addEventListener('click', () => setZoom(viewportState.scale + 0.3));
    document.getElementById('btnZoomOut').addEventListener('click', () => setZoom(viewportState.scale - 0.3));
    document.getElementById('btnZoomReset').addEventListener('click', () => setZoom(1));

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom(viewportState.scale + delta);
    }, { passive: false });

    vp.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.crossing-pin') || e.target.closest('button')) return;
      if (viewportState.scale <= 1) return;
      viewportState.dragging = true;
      viewportState.startX = e.clientX - viewportState.tx;
      viewportState.startY = e.clientY - viewportState.ty;
      vp.classList.add('cursor-grabbing');
    });

    window.addEventListener('pointermove', (e) => {
      if (!viewportState.dragging) return;
      viewportState.tx = e.clientX - viewportState.startX;
      viewportState.ty = e.clientY - viewportState.startY;
      updateStageTransform();
    });

    window.addEventListener('pointerup', () => {
      viewportState.dragging = false;
      vp.classList.remove('cursor-grabbing');
    });
  }

  // Status Styling Helpers
  function statusBadgeStyle(status) {
    switch (status) {
      case 'PRE_ALERT':
        return { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 border-amber-200', ring: 'ring-alert' };
      case 'GATE_LOWERED':
        return { dot: 'bg-rose-600', pill: 'bg-rose-50 text-rose-800 border-rose-200', ring: '' };
      case 'POST_PASS_HOLD':
        return { dot: 'bg-pnr-700', pill: 'bg-pnr-50 text-pnr-800 border-pnr-200', ring: 'ring-hold' };
      case 'FAULT':
        return { dot: 'bg-purple-600', pill: 'bg-purple-50 text-purple-800 border-purple-200', ring: '' };
      default:
        return { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', ring: '' };
    }
  }

  // Render Map Pins & Hotspots
  function renderMapOverlays() {
    const pinsLayer = document.getElementById('pinsLayer');
    const hotspotLayer = document.getElementById('hotspotLayer');

    hotspotLayer.innerHTML = appState.showHotspots
      ? appState.incidents
          .map((inc) => {
            const color = inc.type === 'STONING' ? 'rgba(225, 29, 72, 0.24)' : 'rgba(217, 119, 6, 0.24)';
            const border = inc.type === 'STONING' ? 'rgba(225, 29, 72, 0.55)' : 'rgba(217, 119, 6, 0.55)';
            return `<div class="hotspot-blob" style="left:${inc.xPct}%; top:${inc.yPct}%; width:46px; height:46px; background:radial-gradient(circle, ${color} 0%, transparent 72%); border:1px dashed ${border};"></div>`;
          })
          .join('')
      : '';

    pinsLayer.innerHTML = appState.nodes
      .map((node) => {
        const st = statusBadgeStyle(node.status);
        const isSelected = node.id === appState.selectedNodeId;
        const dragCls = appState.editPinsMode ? 'edit-draggable' : '';
        const selectedRing = isSelected ? 'ring-2 ring-pnr-700 ring-offset-1' : '';
        return `
          <div data-node-id="${node.id}"
               class="crossing-pin ${dragCls} ${st.ring}"
               style="left:${node.xPct}%; top:${node.yPct}%;">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white shadow-md border border-slate-300 ${selectedRing}">
              <span class="w-2.5 h-2.5 rounded-full ${st.dot}"></span>
              <span class="text-[11px] font-bold text-slate-900">${node.shortName}</span>
              <span class="text-[10px] font-mono text-slate-500">${node.status === 'POST_PASS_HOLD' ? node.holdRemainingSec.toFixed(1) + 's' : node.status}</span>
            </div>
          </div>`;
      })
      .join('');

    // Attach click & track-snapped drag handlers
    pinsLayer.querySelectorAll('.crossing-pin').forEach((pinEl) => {
      const nodeId = pinEl.getAttribute('data-node-id');
      pinEl.addEventListener('click', (e) => {
        e.stopPropagation();
        appState.selectedNodeId = nodeId;
        renderAll();
      });

      pinEl.addEventListener('pointerdown', (e) => {
        if (!appState.editPinsMode) return;
        e.stopPropagation();
        pinEl.setPointerCapture(e.pointerId);
        const stage = document.getElementById('corridorMapStage');
        const moveHandler = (ev) => {
          const rect = stage.getBoundingClientRect();
          const rawX = ((ev.clientX - rect.left) / rect.width) * 100;
          const rawY = ((ev.clientY - rect.top) / rect.height) * 100;
          const snapped = snapToTrack(rawX, rawY);
          const targetNode = appState.nodes.find((n) => n.id === nodeId);
          if (targetNode) {
            targetNode.xPct = snapped.x;
            targetNode.yPct = snapped.y;
            pinEl.style.left = snapped.x + '%';
            pinEl.style.top = snapped.y + '%';
          }
        };
        const upHandler = () => {
          pinEl.removeEventListener('pointermove', moveHandler);
          pinEl.removeEventListener('pointerup', upHandler);
          pinEl.removeEventListener('pointercancel', upHandler);
          appendLog('ALIGN', `Snapped ${nodeId} along PNR track geometry.`);
          renderAll();
        };
        pinEl.addEventListener('pointermove', moveHandler);
        pinEl.addEventListener('pointerup', upHandler);
        pinEl.addEventListener('pointercancel', upHandler);
      });
    });
  }

  // Render Right-Column Inspector
  function renderInspector() {
    const node = appState.nodes.find((n) => n.id === appState.selectedNodeId) || appState.nodes[0];
    const st = statusBadgeStyle(node.status);

    document.getElementById('tabNode1').className =
      node.id === 'BP-01'
        ? 'px-3 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm transition'
        : 'px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition';
    document.getElementById('tabNode2').className =
      node.id === 'BP-02'
        ? 'px-3 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm transition'
        : 'px-3 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 transition';

    const badge = document.getElementById('inspectorStatusBadge');
    badge.className = `px-2.5 py-1 rounded-full text-xs font-semibold border ${st.pill}`;
    badge.textContent = node.status;

    document.getElementById('inspectorNodeTitle').textContent = node.name;
    document.getElementById('inspectorNodeCoords').textContent = node.coordsText;
    document.getElementById('shadowModeToggle').checked = node.shadowMode;

    const gateText = document.getElementById('gateStateText');
    const holdBar = document.getElementById('gateHoldBar');
    const etaText = document.getElementById('etaCountdownText');

    if (node.status === 'GATE_LOWERED') {
      gateText.textContent = node.shadowMode ? 'SHADOW UPRIGHT' : 'CLOSED (BARRIER DOWN)';
      gateText.className = 'font-mono font-semibold text-rose-700';
      holdBar.style.width = '100%';
      holdBar.className = 'h-full bg-rose-600 transition-all duration-100';
      etaText.textContent = node.etaSec != null ? `ETA: ${node.etaSec}s` : 'TRAIN IN CROSSING';
    } else if (node.status === 'POST_PASS_HOLD') {
      gateText.textContent = `HOLD CLOSED (${node.holdRemainingSec.toFixed(1)}s)`;
      gateText.className = 'font-mono font-semibold text-pnr-700';
      holdBar.style.width = `${(node.holdRemainingSec / 5) * 100}%`;
      holdBar.className = 'h-full bg-pnr-700 transition-all duration-100';
      etaText.textContent = `Clearance Hold: ${node.holdRemainingSec.toFixed(1)}s / 5.0s`;
    } else if (node.status === 'PRE_ALERT') {
      gateText.textContent = 'STROBES & 90dB CHIME';
      gateText.className = 'font-mono font-semibold text-amber-700';
      holdBar.style.width = '35%';
      holdBar.className = 'h-full bg-amber-500 transition-all duration-100';
      etaText.textContent = node.etaSec != null ? `ETA: ${node.etaSec}s` : 'APPROACHING';
    } else {
      gateText.textContent = 'UPRIGHT (OPEN)';
      gateText.className = 'font-mono font-semibold text-emerald-700';
      holdBar.style.width = '0%';
      etaText.textContent = 'ETA: --';
    }

    // 2-of-3 Sensor Fusion Cards
    const votes = (node.sensors.cam ? 1 : 0) + (node.sensors.vib ? 1 : 0) + (node.sensors.radarKmh > 0 ? 1 : 0);
    document.getElementById('fusionVoteSummary').textContent = `${votes} / 3 Votes`;

    const camCard = document.getElementById('sensorCamCard');
    const vibCard = document.getElementById('sensorVibCard');
    const radCard = document.getElementById('sensorRadCard');

    camCard.className = node.sensors.cam ? 'p-2.5 rounded-lg border border-pnr-200 bg-pnr-50' : 'p-2.5 rounded-lg border border-slate-200 bg-slate-50';
    document.getElementById('sensorCamVal').textContent = node.sensors.cam ? 'TRAIN LOCK' : 'IDLE';

    vibCard.className = node.sensors.vib ? 'p-2.5 rounded-lg border border-pnr-200 bg-pnr-50' : 'p-2.5 rounded-lg border border-slate-200 bg-slate-50';
    document.getElementById('sensorVibVal').textContent = node.sensors.vib ? 'DETECTED' : 'IDLE';

    radCard.className = node.sensors.radarKmh > 0 ? 'p-2.5 rounded-lg border border-pnr-200 bg-pnr-50' : 'p-2.5 rounded-lg border border-slate-200 bg-slate-50';
    document.getElementById('sensorRadVal').textContent = `${node.sensors.radarKmh} km/h`;

    document.getElementById('healthBattery').textContent = `${node.batteryV.toFixed(1)} V`;
    document.getElementById('healthSolar').textContent = `${node.solarW} W Charging`;
    const tamperEl = document.getElementById('healthTamper');
    tamperEl.textContent = node.tamperAlert ? 'TAMPER ALERT' : 'SEALED';
    tamperEl.className = node.tamperAlert ? 'font-mono font-semibold text-rose-700' : 'font-mono font-semibold text-slate-900';

    // Marshal Card
    document.getElementById('marshalName').textContent = node.marshal.name;
    document.getElementById('marshalPhone').textContent = `${node.marshal.phone} • Shift ${node.marshal.shift}`;
  }

  // Render Hotspot Incident Table
  function renderIncidentsTable() {
    const tbody = document.getElementById('incidentTableBody');
    document.getElementById('kpiIncidents').textContent = appState.incidents.length;
    tbody.innerHTML = appState.incidents
      .map((inc) => {
        const pill =
          inc.type === 'STONING'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-amber-50 text-amber-800 border-amber-200';
        return `
          <tr class="hover:bg-slate-50 align-top">
            <td class="py-2.5 px-3.5 font-mono whitespace-nowrap">
              <div class="font-semibold text-slate-900">${inc.id}</div>
              <div class="text-[11px] text-slate-400">${inc.time}</div>
            </td>
            <td class="py-2.5 px-3.5 whitespace-nowrap">
              <div class="font-medium text-slate-800">${inc.sector}</div>
              <span class="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${pill}">${inc.type}</span>
            </td>
            <td class="py-2.5 px-3.5 text-slate-700 leading-relaxed">${inc.message}</td>
            <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
              <button data-view-inc="${inc.id}" type="button" class="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200">
                View Message
              </button>
            </td>
          </tr>`;
      })
      .join('');

    tbody.querySelectorAll('[data-view-inc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inc = appState.incidents.find((i) => i.id === btn.getAttribute('data-view-inc'));
        if (!inc) return;
        document.getElementById('viewReportTitle').textContent = `${inc.id} — ${inc.sector}`;
        document.getElementById('viewReportType').textContent = inc.type;
        document.getElementById('viewReportRole').textContent = inc.role;
        document.getElementById('viewReportTime').textContent = inc.time;
        document.getElementById('viewReportCoords').textContent = `${inc.xPct.toFixed(1)}%, ${inc.yPct.toFixed(1)}%`;
        document.getElementById('viewReportMessage').textContent = inc.message;
        document.getElementById('viewReportModal').classList.remove('hidden');
      });
    });
  }

  // Render Database & GSM JSON Panel
  function renderDatabaseAndJson() {
    const activeNode = appState.nodes.find((n) => n.id === appState.selectedNodeId) || appState.nodes[0];
    const packet = {
      node_id: activeNode.id,
      status: activeNode.status,
      votes: {
        cam: activeNode.sensors.cam ? 1 : 0,
        vib: activeNode.sensors.vib ? 1 : 0,
        rad: activeNode.sensors.radarKmh > 0 ? 1 : 0
      },
      spd_kmh: activeNode.sensors.radarKmh,
      eta_s: activeNode.etaSec,
      hold_s: Number(activeNode.holdRemainingSec.toFixed(1)),
      batt_v: activeNode.batteryV,
      tamper: activeNode.tamperAlert ? 1 : 0
    };
    document.getElementById('gsmJsonPreview').textContent = JSON.stringify(packet, null, 2);
    document.getElementById('kpiSensorEvents').textContent = appState.telemetryLogs.length;

    const container = document.getElementById('dbTableContainer');
    if (appState.activeDbTab === 'crossing_nodes') {
      container.innerHTML = `
        <table class="w-full text-left">
          <thead><tr class="text-slate-400 border-b border-slate-200"><th class="pb-1.5">node_id</th><th class="pb-1.5">status</th><th class="pb-1.5">batt_v</th><th class="pb-1.5">shadow</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${appState.nodes.map((n) => `<tr><td class="py-1.5 font-semibold">${n.id}</td><td class="py-1.5">${n.status}</td><td class="py-1.5">${n.batteryV}V</td><td class="py-1.5">${n.shadowMode}</td></tr>`).join('')}
          </tbody>
        </table>`;
    } else if (appState.activeDbTab === 'sensor_telemetry_logs') {
      container.innerHTML = `
        <table class="w-full text-left">
          <thead><tr class="text-slate-400 border-b border-slate-200"><th class="pb-1.5">log_id</th><th class="pb-1.5">node</th><th class="pb-1.5">votes</th><th class="pb-1.5">action</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${appState.telemetryLogs.slice(0, 6).map((l) => `<tr><td class="py-1.5">${l.id}</td><td class="py-1.5">${l.nodeId}</td><td class="py-1.5">${l.cam}/${l.vib}/${l.radar}</td><td class="py-1.5">${l.action}</td></tr>`).join('')}
          </tbody>
        </table>`;
    } else {
      container.innerHTML = `
        <table class="w-full text-left">
          <thead><tr class="text-slate-400 border-b border-slate-200"><th class="pb-1.5">sms_id</th><th class="pb-1.5">node</th><th class="pb-1.5">marshal</th><th class="pb-1.5">status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${appState.smsLogs.slice(0, 6).map((s) => `<tr><td class="py-1.5">${s.id}</td><td class="py-1.5">${s.nodeId}</td><td class="py-1.5">${s.marshal}</td><td class="py-1.5">${s.status}</td></tr>`).join('')}
          </tbody>
        </table>`;
    }
  }

  // Riles Marshal SMS Dispatch & 2-Minute Countdown
  function triggerMarshalSmsDispatch(node, category) {
    const marshalShort = node.marshal.name.split(' (')[0];
    appState.activeMarshalAlert = {
      nodeId: node.id,
      marshal: marshalShort,
      remainingSec: 120,
      acknowledged: false
    };
    appState.smsLogs.unshift({
      id: 'SMS-' + (42 + appState.smsLogs.length),
      nodeId: node.id,
      marshal: marshalShort,
      category,
      sentAt: nowTimeStr(),
      ackSec: null,
      status: 'DISPATCHED'
    });
    appendLog('SMS', `Dispatched ${category} alert to ${marshalShort} (${node.marshal.phone}).`);
    updateMarshalBadge();
  }

  function updateMarshalBadge() {
    const badge = document.getElementById('marshalTimerBadge');
    if (!appState.activeMarshalAlert) {
      badge.textContent = 'STANDBY';
      badge.className = 'px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200';
      return;
    }
    if (appState.activeMarshalAlert.acknowledged) {
      badge.textContent = 'SECURED ≤2m';
      badge.className = 'px-2 py-0.5 rounded font-mono text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      return;
    }
    const mins = String(Math.floor(appState.activeMarshalAlert.remainingSec / 60)).padStart(2, '0');
    const secs = String(appState.activeMarshalAlert.remainingSec % 60).padStart(2, '0');
    badge.textContent = `DUE ${mins}:${secs}`;
    badge.className = 'px-2 py-0.5 rounded font-mono text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200';
  }

  // 5.0-Second Post-Pass Gate Hold Timer
  function startPostPassHold(node) {
    if (simController.holdTimers[node.id]) {
      clearInterval(simController.holdTimers[node.id]);
    }
    node.status = 'POST_PASS_HOLD';
    node.holdRemainingSec = 5.0;
    node.etaSec = null;
    node.sensors = { cam: false, vib: false, radarKmh: 0 };
    appendLog('HOLD', `${node.shortName} train cleared — holding gates closed for 5.0s safety buffer.`);
    renderAll();

    simController.holdTimers[node.id] = setInterval(() => {
      node.holdRemainingSec = Math.max(0, Number((node.holdRemainingSec - 0.1).toFixed(1)));
      if (node.holdRemainingSec <= 0) {
        clearInterval(simController.holdTimers[node.id]);
        delete simController.holdTimers[node.id];
        node.status = 'CLEAR';
        appendLog('CLEAR', `${node.shortName} 5.0s buffer complete — dual drop arms raised.`);
      }
      renderMapOverlays();
      renderInspector();
      renderDatabaseAndJson();
    }, 100);
  }

  // Corridor Train Simulation (Spot 1 -> Spot 2 along georeferenced track)
  function stopSimulation() {
    simController.running = false;
    if (simController.rafId) cancelAnimationFrame(simController.rafId);
    Object.keys(simController.holdTimers).forEach((k) => {
      clearInterval(simController.holdTimers[k]);
      delete simController.holdTimers[k];
    });
    const marker = document.getElementById('trainMarker');
    if (marker) marker.classList.add('hidden');
  }

  function runCorridorSimulation() {
    if (simController.running) return;
    simController.running = true;

    const sortedNodes = [...appState.nodes]
      .map((n) => ({ node: n, trackDist: snapToTrack(n.xPct, n.yPct).distAlong }))
      .sort((a, b) => a.trackDist - b.trackDist);

    const losBanosDist = TRACK_METRICS.segs[3].startDist; // 4. Los Baños Station
    const lastCrossingDist = sortedNodes[sortedNodes.length - 1].trackDist;
    const startDist = losBanosDist;
    const endDist = Math.min(TRACK_METRICS.total, lastCrossingDist + 9);

    const passedSet = new Set();
    const marker = document.getElementById('trainMarker');
    marker.classList.remove('hidden');

    appendLog('TRAIN', 'PNR IPC-04 departed Los Baños Station southbound toward San Pablo Pilot Crossings (54 km/h).');

    let currentDist = startDist;
    let lastTs = performance.now();

    function step(now) {
      if (!simController.running) return;
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      currentDist += 0.65 * dt;

      const pos = pointAtDistance(currentDist);
      marker.style.left = pos.x + '%';
      marker.style.top = pos.y + '%';

      sortedNodes.forEach(({ node, trackDist }) => {
        if (passedSet.has(node.id)) return;
        const delta = trackDist - currentDist;

        if (delta <= 10.5 && delta > 5.5 && node.status === 'CLEAR') {
          node.status = 'PRE_ALERT';
          node.etaSec = 28;
          node.sensors = { cam: true, vib: false, radarKmh: 54 };
          appState.selectedNodeId = node.id;
          appState.telemetryLogs.unshift({
            id: 'TL-' + (903 + appState.telemetryLogs.length),
            nodeId: node.id,
            time: nowTimeStr(),
            cam: 1,
            vib: 0,
            radar: 1,
            speed: 54,
            action: '2_OF_3_PRE_ALERT'
          });
          triggerMarshalSmsDispatch(node, 'APPROACH_PRE_ALERT');
          appendLog('ALERT', `${node.shortName} 2-of-3 fusion locked (AI Vision + Radar) — PRE_ALERT.`);
        } else if (delta <= 5.5 && delta > 0 && (node.status === 'PRE_ALERT' || node.status === 'CLEAR')) {
          node.status = 'GATE_LOWERED';
          node.etaSec = Math.max(1, Math.round(delta * 4));
          node.sensors = { cam: true, vib: true, radarKmh: 54 };
          appState.selectedNodeId = node.id;
          appendLog('GATE', `${node.shortName} drop arms lowered (staggered 3s delay, 25s window).`);
        } else if (delta <= 0) {
          passedSet.add(node.id);
          startPostPassHold(node);
        }
      });

      renderMapOverlays();
      renderInspector();
      renderDatabaseAndJson();

      if (currentDist < endDist) {
        simController.rafId = requestAnimationFrame(step);
      } else {
        simController.running = false;
        marker.classList.add('hidden');
        appendLog('TRAIN', 'PNR IPC-04 cleared San Pablo Pilot Sector southbound toward Tiaong.');
      }
    }

    simController.rafId = requestAnimationFrame(step);
  }

  function applyMapImageState() {
    const img = document.getElementById('customMapImg');
    const svg = document.getElementById('builtinLagunaQuezonSvg');
    const resetBtn = document.getElementById('btnResetMapImg');
    if (appState.customMapDataUrl) {
      img.src = appState.customMapDataUrl;
      img.classList.remove('hidden');
      svg.classList.add('hidden');
      resetBtn.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
      svg.classList.remove('hidden');
      resetBtn.classList.add('hidden');
    }
  }

  function renderAll() {
    renderMapOverlays();
    renderInspector();
    renderIncidentsTable();
    renderEventLog();
    renderDatabaseAndJson();
    updateMarshalBadge();
  }

  // Wire Event Listeners
  function bindEvents() {
    // Developer Menu Toggle
    const devBtn = document.getElementById('btnToggleDevMenu');
    const devBar = document.getElementById('developerMenuBar');
    devBtn.addEventListener('click', () => {
      const hidden = devBar.classList.toggle('hidden');
      devBtn.setAttribute('aria-expanded', String(!hidden));
    });

    // Save Snapshot & Rollback
    document.getElementById('btnSaveSnapshot').addEventListener('click', () => {
      RollbackEngine.save();
    });
    document.getElementById('btnRollback').addEventListener('click', () => {
      const id = document.getElementById('checkpointSelect').value;
      RollbackEngine.rollback(id);
    });

    // Custom Map Image Upload
    document.getElementById('mapImageInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        appState.customMapDataUrl = reader.result;
        applyMapImageState();
        appendLog('MAP', `Loaded custom map overlay "${file.name}".`);
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('btnResetMapImg').addEventListener('click', () => {
      appState.customMapDataUrl = null;
      applyMapImageState();
      appendLog('MAP', 'Restored built-in georeferenced Laguna–Quezon vector map.');
    });

    // Map Toolbar Toggles
    document.getElementById('btnToggleHotspots').addEventListener('click', (e) => {
      appState.showHotspots = !appState.showHotspots;
      e.target.textContent = `Hotspots: ${appState.showHotspots ? 'ON' : 'OFF'}`;
      renderMapOverlays();
    });

    document.getElementById('btnTogglePinEdit').addEventListener('click', (e) => {
      appState.editPinsMode = !appState.editPinsMode;
      e.target.textContent = `Align Pins: ${appState.editPinsMode ? 'ON' : 'OFF'}`;
      renderMapOverlays();
    });

    document.getElementById('btnSimulateCorridor').addEventListener('click', runCorridorSimulation);

    // Inspector Tabs & Manual Controls
    document.getElementById('tabNode1').addEventListener('click', () => {
      appState.selectedNodeId = 'BP-01';
      renderAll();
    });
    document.getElementById('tabNode2').addEventListener('click', () => {
      appState.selectedNodeId = 'BP-02';
      renderAll();
    });
    document.getElementById('shadowModeToggle').addEventListener('change', (e) => {
      const node = appState.nodes.find((n) => n.id === appState.selectedNodeId);
      if (node) {
        node.shadowMode = e.target.checked;
        appendLog('MODE', `${node.shortName} Phase 3 Shadow Mode set to ${node.shadowMode ? 'ON' : 'OFF'}.`);
        renderAll();
      }
    });
    document.getElementById('btnForceClear').addEventListener('click', () => {
      stopSimulation();
      appState.nodes.forEach((n) => {
        n.status = 'CLEAR';
        n.etaSec = null;
        n.holdRemainingSec = 0;
        n.tamperAlert = false;
        n.sensors = { cam: false, vib: false, radarKmh: 0 };
      });
      appendLog('RESET', 'All crossings reset to CLEAR.');
      renderAll();
    });
    document.getElementById('btnTriggerFault').addEventListener('click', () => {
      const node = appState.nodes.find((n) => n.id === appState.selectedNodeId);
      if (!node) return;
      node.status = 'FAULT';
      node.tamperAlert = true;
      triggerMarshalSmsDispatch(node, 'HARDWARE_FAULT');
      appendLog('FAULT', `${node.shortName} IP65 enclosure tamper / fault triggered.`);
      renderAll();
    });

    // Tagalog Audio Deterrence Test
    document.getElementById('btnTriggerAudioWarn').addEventListener('click', () => {
      appendLog('AUDIO', 'Directional 88dB speaker fired: "Bawal batuhin ang tren, nakamamatay!"');
    });

    // Marshal Check-In
    document.getElementById('btnMarshalCheckIn').addEventListener('click', () => {
      if (!appState.activeMarshalAlert) {
        appendLog('MARSHAL', 'On-duty Riles Marshal verified active on shift.');
        return;
      }
      appState.activeMarshalAlert.acknowledged = true;
      const elapsed = 120 - appState.activeMarshalAlert.remainingSec;
      if (appState.smsLogs[0]) {
        appState.smsLogs[0].status = 'ACKNOWLEDGED';
        appState.smsLogs[0].ackSec = elapsed;
      }
      appendLog('MARSHAL', `${appState.activeMarshalAlert.marshal} secured crossing in ${elapsed}s (≤ 2m target).`);
      updateMarshalBadge();
      renderDatabaseAndJson();
    });

    // Clear Log
    document.getElementById('btnClearLog').addEventListener('click', () => {
      appState.eventFeed = [];
      renderEventLog();
    });

    // QR Report Submission
    document.getElementById('btnOpenQrModal').addEventListener('click', () => {
      document.getElementById('qrReportModal').classList.remove('hidden');
    });
    document.getElementById('qrReportForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const sectorVal = document.getElementById('qrSectorSelect').value;
      const type = document.getElementById('qrTypeSelect').value;
      const role = document.getElementById('qrRoleSelect').value;
      const message = document.getElementById('qrNotesInput').value.trim();
      if (!message) return;

      let coords = { x: 39.4, y: 66.7, label: 'Mid-Sector (San Pablo–Tiaong)' };
      if (sectorVal === 'BP-01') {
        const n = appState.nodes[0];
        coords = { x: n.xPct, y: n.yPct, label: 'Spot 1 (San Nicolas)' };
      } else if (sectorVal === 'BP-02') {
        const n = appState.nodes[1];
        coords = { x: n.xPct, y: n.yPct, label: 'Spot 2 (San Rafael)' };
      }

      const newId = 'INC-' + (105 + appState.incidents.length);
      appState.incidents.unshift({
        id: newId,
        sector: coords.label,
        type,
        role,
        time: nowTimeStr().slice(0, 5) + ' PST',
        xPct: coords.x,
        yPct: coords.y,
        message
      });
      document.getElementById('qrNotesInput').value = '';
      document.getElementById('qrReportModal').classList.add('hidden');
      appendLog('QR_LOG', `New ${type} report (${newId}) logged at ${coords.label}.`);
      renderAll();
    });

    // GSM Packet Simulator
    document.getElementById('btnOpenGsmModal').addEventListener('click', () => {
      document.getElementById('gsmPayloadEditor').value = document.getElementById('gsmJsonPreview').textContent;
      document.getElementById('gsmPacketModal').classList.remove('hidden');
    });
    document.querySelectorAll('.gsm-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-gsm-preset');
        const presets = {
          PRE_ALERT_1: { node_id: 'BP-01', status: 'PRE_ALERT', votes: { cam: 1, vib: 0, rad: 1 }, spd_kmh: 52, eta_s: 29, batt_v: 13.3, tamper: 0 },
          GATE_2: { node_id: 'BP-02', status: 'GATE_LOWERED', votes: { cam: 1, vib: 1, rad: 1 }, spd_kmh: 55, eta_s: 18, batt_v: 13.2, tamper: 0 },
          FAULT_1: { node_id: 'BP-01', status: 'FAULT', votes: { cam: 0, vib: 0, rad: 0 }, spd_kmh: 0, eta_s: null, batt_v: 11.4, tamper: 1 },
          CLEAR_ALL: { node_id: 'BP-01', status: 'CLEAR', votes: { cam: 0, vib: 0, rad: 0 }, spd_kmh: 0, eta_s: null, batt_v: 13.4, tamper: 0 }
        };
        document.getElementById('gsmPayloadEditor').value = JSON.stringify(presets[p], null, 2);
      });
    });
    document.getElementById('btnSendGsmPacket').addEventListener('click', () => {
      try {
        const payload = JSON.parse(document.getElementById('gsmPayloadEditor').value);
        const target = appState.nodes.find((n) => n.id === payload.node_id) || appState.nodes[0];
        target.status = payload.status || 'CLEAR';
        target.etaSec = payload.eta_s ?? null;
        target.batteryV = payload.batt_v ?? target.batteryV;
        target.tamperAlert = Boolean(payload.tamper);
        if (payload.votes) {
          target.sensors = {
            cam: Boolean(payload.votes.cam),
            vib: Boolean(payload.votes.vib),
            radarKmh: payload.spd_kmh || 0
          };
        }
        appState.selectedNodeId = target.id;
        if (target.status === 'PRE_ALERT' || target.status === 'FAULT') {
          triggerMarshalSmsDispatch(target, target.status);
        }
        appendLog('GSM_RX', `Ingested packet for ${target.id} -> ${target.status}.`);
        document.getElementById('gsmPacketModal').classList.add('hidden');
        renderAll();
      } catch (err) {
        alert('Invalid JSON payload format.');
      }
    });

    // Copy JSON & Export CSV
    document.getElementById('btnCopyJson').addEventListener('click', () => {
      navigator.clipboard?.writeText(document.getElementById('gsmJsonPreview').textContent);
      appendLog('COPY', 'Copied compact GSM telemetry JSON packet to clipboard.');
    });

    document.getElementById('btnExportCsv').addEventListener('click', () => {
      const rows = [
        ['RecordType', 'ID', 'NodeOrSector', 'StatusOrCategory', 'Details'],
        ...appState.nodes.map((n) => ['NODE', n.id, n.name, n.status, `${n.batteryV}V`]),
        ...appState.incidents.map((i) => ['INCIDENT', i.id, i.sector, i.type, `"${i.message.replace(/"/g, '""')}"`])
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bantay-map-pilot-evaluation.csv';
      a.click();
      URL.revokeObjectURL(url);
      appendLog('EXPORT', 'Downloaded bantay-map-pilot-evaluation.csv.');
    });

    // DB Table Tabs
    document.querySelectorAll('.db-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        appState.activeDbTab = btn.getAttribute('data-db-tab');
        document.querySelectorAll('.db-tab-btn').forEach((b) => {
          b.className =
            b === btn
              ? 'db-tab-btn px-2.5 py-1.5 rounded-t font-mono font-semibold bg-white text-pnr-700 border border-b-0 border-slate-200'
              : 'db-tab-btn px-2.5 py-1.5 rounded-t font-mono text-slate-600 hover:text-slate-900';
        });
        renderDatabaseAndJson();
      });
    });

    // Modal Open / Close & Escape Key
    document.getElementById('btnOpenGuide').addEventListener('click', () => {
      document.getElementById('guideModal').classList.remove('hidden');
    });
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.getAttribute('data-close-modal')).classList.add('hidden');
      });
    });
    ['guideModal', 'qrReportModal', 'viewReportModal', 'gsmPacketModal'].forEach((id) => {
      const modal = document.getElementById(id);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['guideModal', 'qrReportModal', 'viewReportModal', 'gsmPacketModal'].forEach((id) => {
          document.getElementById(id).classList.add('hidden');
        });
      }
    });
  }

  // Live Clock & Marshal Countdown Interval
  setInterval(() => {
    const clock = document.getElementById('liveClock');
    if (clock) clock.textContent = `${nowTimeStr()} PST`;
    if (appState.activeMarshalAlert && !appState.activeMarshalAlert.acknowledged && appState.activeMarshalAlert.remainingSec > 0) {
      appState.activeMarshalAlert.remainingSec -= 1;
      updateMarshalBadge();
    }
  }, 1000);

  // Boot
  RollbackEngine.init();
  initZoomPan();
  bindEvents();
  renderAll();
})();
