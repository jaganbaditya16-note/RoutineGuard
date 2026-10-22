"use client";

import { useEffect, useState } from "react";
import { createDemoScenario, evaluateRoutine } from "@/lib/routine-engine.mjs";

type Scenario = "clear" | "offline" | "conflict" | "missing";
type Tone = "pass" | "review" | "blocked" | "unknown";

type TestResult = {
  tone: Tone;
  status: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
};

type HistoryEntry = {
  id: string;
  timestamp: string;
  scenario: Scenario;
  routineName: string;
  status: string;
  tone: Tone;
  title: string;
  evidence: string;
  recommendation: string;
};

const scenarioOptions: {
  value: Scenario;
  code: string;
  label: string;
  description: string;
}[] = [
  {
    value: "clear",
    code: "✓",
    label: "All checks clear",
    description: "Every simulated step responds",
  },
  {
    value: "offline",
    code: "×",
    label: "Device offline",
    description: "The robot vacuum cannot respond",
  },
  {
    value: "conflict",
    code: "↔",
    label: "Schedule conflict",
    description: "Two routines control one light",
  },
  {
    value: "missing",
    code: "?",
    label: "Sensor data missing",
    description: "A safety reading is unavailable",
  },
];

const navigation = [
  { label: "Overview", target: "dashboard", symbol: "▦" },
  { label: "Routine Lab", target: "routine-lab", symbol: "⌁" },
  { label: "Devices", target: "devices", symbol: "◈" },
  { label: "Activity Log", target: "activity-log", symbol: "≡" },
];



export default function Home() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [scenario, setScenario] = useState<Scenario>("offline");
  const [result, setResult] = useState<TestResult | null>(null);
  const [runCount, setRunCount] = useState(0);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem("routineguard-history");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Intentional restoration of saved browser session history.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHistory(parsed.slice(0, 20) as HistoryEntry[]);
        }
      }
    } catch {
      // Keep the app usable if browser storage is unavailable.
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.sessionStorage.setItem(
        "routineguard-history",
        JSON.stringify(history),
      );
    } catch {
      // History can still be used in page memory.
    }
  }, [history, historyLoaded]);
  const [routineName, setRoutineName] = useState("Evening Reset");
  const [routineTime, setRoutineTime] = useState("19:30");
  const [routineHour, routineMinute] = routineTime.split(":").map(Number);
  const displayRoutineTime = new Date(
    2000, 0, 1, routineHour, routineMinute
  ).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  function handleNavigation(label: string) {
    setActiveNav(label);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function runSimulation() {
    const input = createDemoScenario(scenario);
    const parsedTime = routineTime.split(":").map(Number);
    const startMinute = parsedTime[0] * 60 + parsedTime[1];

    input.routine.name = routineName.trim() || "Untitled routine";

    input.routine.steps.forEach((step) => {
      const duration = step.deviceId === "robot-vacuum" ? 30 : 5;
      step.schedule = {
        startMinute,
        endMinute: Math.min(startMinute + duration, 24 * 60),
      };
    });

    const evaluation = evaluateRoutine(input);
    const occurredAt = new Date();

    const entry: HistoryEntry = {
      id: `${occurredAt.getTime()}-${runCount + 1}`,
      timestamp: occurredAt.toISOString(),
      scenario,
      routineName: input.routine.name,
      status: evaluation.status,
      tone: evaluation.tone,
      title: evaluation.title,
      evidence: evaluation.evidence,
      recommendation: evaluation.recommendation,
    };

    setHistory((current) => [entry, ...current].slice(0, 20));
    setResult(evaluation);
    setRunCount((count) => count + 1);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => handleNavigation("Overview")}
          aria-label="RoutineGuard overview"
        >
          <span className="brand-mark">r<span>.</span></span>
          <span className="brand-wording">
            <strong>routine<span>guard</span></strong>
            <small>HOME RELIABILITY</small>
          </span>
        </button>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-link ${activeNav === item.label ? "active" : ""}`}
              onClick={() => handleNavigation(item.label)}
            >
              <span className="nav-symbol">{item.symbol}</span>
              <span>{item.label}</span>
              {item.label === "Routine Lab" && (
                <span className="nav-new">TRY</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="side-note">
          <div className="side-note-icon">✳</div>
          <strong>Trust, but verify.</strong>
          <p>Test the routine before you depend on it.</p>
          <button onClick={() => handleNavigation("Routine Lab")}>
            Open Routine Lab <span>→</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <span className="footer-avatar">RG</span>
          <span className="footer-profile">
            <strong>Personal home</strong>
            <small>Local demo workspace</small>
          </span>
          <span className="footer-dots">···</span>
        </div>
      </aside>

      <main className={`main-content view-${activeNav.toLowerCase().replace(" ", "-")}`} id="dashboard">
        <div className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-dot" />
            LOCAL WORKSPACE <span className="breadcrumb-slash">/</span> {activeNav.toUpperCase()}
          </div>
          <div className="topbar-right">
            <span className="environment-pill">
              <span /> SIMULATION MODE
            </span>
            <div className="top-avatar">RG</div>
          </div>
        </div>

        <header className="page-heading">
          <div>
            <div className="eyebrow">YOUR HOME, WITHOUT THE GUESSWORK</div>
            <h1>Make every routine <span>trustworthy.</span></h1>
            <p>
              Test your automations, catch conflicts, and understand what
              needs attention before a routine runs.
            </p>
          </div>
          <button
            className="primary-button heading-button"
            onClick={() => handleNavigation("Routine Lab")}
          >
            <span>＋</span> Test a routine
          </button>
        </header>

        <section className="hero-card">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-content">
            <div className="hero-label">
              <span className="hero-label-dot" />
              ROUTINEGUARD · ROUTINE RELIABILITY
            </div>
            <h2>
              Peace of mind starts
              <br />
              <span>before the routine runs.</span>
            </h2>
            <p>
              Think of it as a pre-flight check for your smart home. Find
              missing data, unexpected conflicts, and steps that cannot
              be verified.
            </p>
            <button
              className="hero-button"
              onClick={() => handleNavigation("Routine Lab")}
            >
              Explore Routine Lab <span>↗</span>
            </button>
          </div>

          <div className="hero-preview">
            <div className="preview-header">
              <span className="preview-window-dots"><i /><i /><i /></span>
              <span>ROUTINE PREVIEW</span>
              <span className="preview-demo-tag">DEMO</span>
            </div>
            <div className="preview-routine-title">
              <div className="preview-routine-icon">⌂</div>
              <div>
                <strong>Evening reset</strong>
                <small>Example routine · 3 steps</small>
              </div>
              <span className="preview-clock">7:30 PM</span>
            </div>
            <div className="preview-step">
              <span className="step-check">✓</span>
              <div><strong>Check living-room light</strong><small>Simulated response received</small></div>
              <span className="step-status good">OK</span>
            </div>
            <div className="preview-step">
              <span className="step-check step-warning">!</span>
              <div><strong>Start robot vacuum</strong><small>Simulated device is offline</small></div>
              <span className="step-status warn">REVIEW</span>
            </div>
            <div className="preview-bottom">
              <span className="preview-mini-icon">✳</span>
              <span>One issue found before execution</span>
              <span className="preview-arrow">↗</span>
            </div>
          </div>
          <div className="hero-decoration">RG</div>
        </section>

        <div className="demo-notice">
          <span className="notice-icon">i</span>
          <span>
            <strong>Prototype environment:</strong> all device states and
            readings are simulated. Nothing in this app controls real
            appliances or confirms real-world safety.
          </span>
        </div>

        <section className="metrics-grid" aria-label="Demo statistics">
          <article className="metric-card">
            <div className="metric-top">
              <span>ROUTINES IN EXAMPLE</span>
              <span className="metric-icon lavender">⌁</span>
            </div>
            <div className="metric-number">03</div>
            <div className="metric-foot">Sample household routines</div>
            <div className="metric-line lavender-line"><span /></div>
          </article>
          <article className="metric-card">
            <div className="metric-top">
              <span>SIMULATIONS RUN</span>
              <span className="metric-icon mint">◉</span>
            </div>
            <div className="metric-number">{String(runCount).padStart(2, "0")}</div>
            <div className="metric-foot">This browser session</div>
            <div className="metric-line mint-line"><span style={{ width: `${Math.min(runCount * 18, 100)}%` }} /></div>
          </article>
          <article className="metric-card">
            <div className="metric-top">
              <span>CONNECTED DEVICES</span>
              <span className="metric-icon peach">◈</span>
            </div>
            <div className="metric-number">00 <span className="metric-small-word">real</span></div>
            <div className="metric-foot">Simulated devices only</div>
            <div className="metric-line peach-line"><span /></div>
          </article>
        </section>

        <section className="section-block" id="routine-lab">
          <div className="section-heading">
            <div>
              <div className="section-kicker">01 / TEST BEFORE YOU TRUST</div>
              <h2>Your Routine Lab</h2>
              <p>Choose a scenario to see how RoutineGuard handles it.</p>
            </div>
            <span className="section-badge"><span /> DETERMINISTIC DEMO</span>
          </div>

          <div className="lab-grid">
            <article className="panel scenario-panel">
              <div className="panel-heading">
                <div className="panel-heading-icon">⌘</div>
                <div>
                  <h3>What should we test?</h3>
                  <p>Choose a scenario for <strong>{routineName || "this routine"}</strong>.</p>
                </div>
              </div>

              <div className="routine-editor-fields">
                <label className="editor-field">
                  <span>ROUTINE NAME</span>
                  <input
                    aria-label="Routine name"
                    value={routineName}
                    maxLength={50}
                    onChange={(event) => setRoutineName(event.target.value)}
                    placeholder="Enter routine name"
                  />
                </label>
                <label className="editor-field">
                  <span>START TIME</span>
                  <input
                    aria-label="Routine start time"
                    type="time"
                    value={routineTime}
                    onChange={(event) => setRoutineTime(event.target.value)}
                  />
                </label>
              </div>
              <p className="routine-editor-help">
                Edit these values and run a check. The time can change whether schedules overlap.
              </p>
              <div className="scenario-list">
                {scenarioOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={`scenario-option ${scenario === option.value ? "selected" : ""}`}
                    onClick={() => setScenario(option.value)}
                    aria-pressed={scenario === option.value}
                  >
                    <span className={`scenario-symbol symbol-${option.value}`}>
                      {option.code}
                    </span>
                    <span className="scenario-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="scenario-radio">
                      {scenario === option.value ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>

              <div className="selected-routine">
                <div className="selected-routine-icon">⌂</div>
                <div className="selected-routine-copy">
                  <strong>{routineName.trim() || "Untitled routine"}</strong>
                  <small>3 steps <span>·</span> editable sample</small>
                </div>
                <span className="routine-time">{displayRoutineTime}</span>
              </div>

              <button className="run-button" onClick={runSimulation}>
                Run reliability check <span>→</span>
              </button>
              <p className="button-footnote">
                <span>✳</span> Local simulation only · No devices are contacted
              </p>
            </article>

            <article className="panel report-panel" id="latest-report">
              <div className="report-header">
                <div>
                  <div className="section-kicker">LATEST RESULT</div>
                  <h3>Reliability report</h3>
                </div>
                <span className="report-file-icon">▤</span>
              </div>

              {result ? (
                <div className="result-content" aria-live="polite">
                  <div className={`result-status tone-${result.tone}`}>
                    <span className="result-status-symbol">
                      {result.tone === "pass" ? "✓" : result.tone === "review" ? "!" : result.tone === "blocked" ? "×" : "?"}
                    </span>
                    <span>{result.status}</span>
                    <small>SIMULATED RESULT</small>
                  </div>
                  <h4>{result.title}</h4>
                  <p className="result-description">{result.description}</p>
                  <div className="result-detail">
                    <div className="result-detail-label"><span>01</span> OBSERVATION</div>
                    <p>{result.evidence}</p>
                  </div>
                  <div className="result-detail recommendation">
                    <div className="result-detail-label"><span>02</span> RECOMMENDED NEXT STEP</div>
                    <p>{result.recommendation}</p>
                  </div>
                  <div className="report-disclaimer">
                    Example result #{runCount || 0}. This is not a real device
                    status or an emergency assessment.
                  </div>
                </div>
              ) : (
                <div className="empty-report">
                  <div className="empty-report-icon">✳</div>
                  <h4>Your test report starts here.</h4>
                  <p>
                    Select a scenario and run the check. You’ll see the result,
                    the evidence, and a practical next step.
                  </p>
                  <div className="empty-report-footer">
                    <span>✓</span> Clear explanations, no false all-clears
                  </div>
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="section-block devices-section" id="devices">
          <div className="section-heading compact-heading">
            <div>
              <div className="section-kicker">02 / YOUR EXAMPLE SETUP</div>
              <h2>Device overview</h2>
              <p>Illustrative data for developing and testing the prototype.</p>
            </div>
            <span className="muted-pill">SIMULATED DEVICES</span>
          </div>

          <div className="devices-grid">
            <article className="device-card">
              <div className="device-icon device-purple">⌁</div>
              <div className="device-details">
                <strong>Robot vacuum</strong>
                <small>Cleaning · Living area</small>
              </div>
              <span className="device-state state-simulated"><i /> Demo</span>
            </article>
            <article className="device-card">
              <div className="device-icon device-yellow">☼</div>
              <div className="device-details">
                <strong>Living-room light</strong>
                <small>Lighting · Main room</small>
              </div>
              <span className="device-state state-simulated"><i /> Demo</span>
            </article>
            <article className="device-card">
              <div className="device-icon device-red">⌖</div>
              <div className="device-details">
                <strong>Smoke sensor</strong>
                <small>Safety · Hallway</small>
              </div>
              <span className="device-state state-unknown"><i /> No feed</span>
            </article>
            <article className="device-card">
              <div className="device-icon device-blue">ϟ</div>
              <div className="device-details">
                <strong>Smart plug</strong>
                <small>Power · Desk</small>
              </div>
              <span className="device-state state-simulated"><i /> Demo</span>
            </article>
          </div>
        </section>

        <section className="section-block schedule-section">
          <div className="section-heading compact-heading">
            <div>
              <div className="section-kicker">03 / ROUTINE LIBRARY</div>
              <h2>Example routines</h2>
              <p>Sample schedules are for the demo only.</p>
            </div>
          </div>
          <div className="routine-list">
            <div className="routine-row">
              <div className="routine-row-icon lavender">⌂</div>
              <div className="routine-row-main"><strong>Evening Reset</strong><small>Lights · Vacuum · Smart plug</small></div>
              <span className="routine-row-time">7:30 PM</span>
              <span className="routine-state state-review">Needs testing</span>
            </div>
            <div className="routine-row">
              <div className="routine-row-icon mint">☼</div>
              <div className="routine-row-main"><strong>Morning Start</strong><small>Lights · Morning schedule</small></div>
              <span className="routine-row-time">7:00 AM</span>
              <span className="routine-state state-demo">Example</span>
            </div>
            <div className="routine-row">
              <div className="routine-row-icon peach">◷</div>
              <div className="routine-row-main"><strong>Focus Hour</strong><small>Lighting · Quiet time</small></div>
              <span className="routine-row-time">2:00 PM</span>
              <span className="routine-state state-demo">Example</span>
            </div>
          </div>
        </section>

        <section className="section-block history-section" id="activity-log">
          <div className="section-heading compact-heading">
            <div>
              <div className="section-kicker">04 / YOUR RECENT CHECKS</div>
              <h2>Activity Log</h2>
              <p>Review recent test results and the evidence behind them.</p>
            </div>
            <button
              type="button"
              className="clear-history-button"
              disabled={history.length === 0}
              onClick={() => setHistory([])}
            >
              Clear history
            </button>
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">≡</div>
              <h3>No checks recorded yet</h3>
              <p>Run a reliability check in the Routine Lab. Results will appear here.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((entry) => (
                <article className="history-item" key={entry.id}>
                  <div className="history-item-meta">
                    <span className={`history-status tone-${entry.tone}`}>
                      {entry.status}
                    </span>
                    <span className="history-scenario">
                      {scenarioOptions.find(
                        (option) => option.value === entry.scenario,
                      )?.label ?? entry.scenario}
                    </span>
                    <time dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <h3>{entry.routineName}</h3>
                  <p className="history-result-title">{entry.title}</p>
                  <div className="history-evidence">
                    <strong>Evidence</strong>
                    <p>{entry.evidence}</p>
                  </div>
                  <details className="history-details">
                    <summary>View recommendation</summary>
                    <p>{entry.recommendation}</p>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer className="app-footer">
          <div className="footer-brand"><span className="footer-brand-mark">r.</span> routineguard</div>
          <p>Built to test routines, explain uncertainty, and avoid false confidence.</p>
          <span className="footer-version">LOCAL PROTOTYPE · V0.1</span>
        </footer>
      </main>
    </div>
  );
}
