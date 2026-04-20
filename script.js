const form = document.getElementById("automata-form");
const regexInput = document.getElementById("regex-input");
const stringInput = document.getElementById("string-input");
const alphabetValue = document.getElementById("alphabet-value");
const simulationBadge = document.getElementById("simulation-badge");
const equivalenceBadge = document.getElementById("equivalence-badge");
const simulationDockContent = document.getElementById("simulation-dock-content");
const detailStage = document.getElementById("detail-stage");
const detailStates = document.getElementById("detail-states");
const detailTransitions = document.getElementById("detail-transitions");
const detailResult = document.getElementById("detail-result");
const detailHeading = document.getElementById("detail-heading");
const detailBody = document.getElementById("detail-body");
const inspectorEqTable = document.getElementById("inspector-eq-table");
const canvasStageTitle = document.getElementById("canvas-stage-title");
const canvasStageBadge = document.getElementById("canvas-stage-badge");
const pipelineProgressBar = document.getElementById("pipeline-progress-bar");
const prevStageBtn = document.getElementById("prev-stage-btn");
const nextStageBtn = document.getElementById("next-stage-btn");

const panels = {
  regex: document.getElementById("regex-panel"),
  nfa: document.getElementById("nfa-panel"),
  dfa: document.getElementById("dfa-panel"),
  min: document.getElementById("min-panel"),
  eq: document.getElementById("eq-panel"),
  sim: document.getElementById("sim-panel"),
};

const stageSheets = [...document.querySelectorAll(".stage-sheet")];
const pipelineSteps = [...document.querySelectorAll(".pipeline-step")];
const examplePills = [...document.querySelectorAll(".example-pill")];
const stageJumpButtons = [...document.querySelectorAll("[data-stage-jump]")];

const stageMeta = [
  { key: "regex", title: "Regex", badge: "Input Expression" },
  { key: "nfa", title: "NFA", badge: "Thompson Construction" },
  { key: "dfa", title: "DFA", badge: "Subset Construction" },
  { key: "min", title: "Minimized DFA", badge: "Partition Refinement" },
  { key: "eq", title: "Equivalence Check", badge: "Behavior Comparison" },
  { key: "sim", title: "String Simulation", badge: "Execution Trace" },
];

let simulationTimer = null;
let liveInputTimer = null;
let simulationController = null;
let currentStageIndex = 0;
let latestPipelineData = null;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runPipeline(1);
});

regexInput.addEventListener("input", scheduleLivePipeline);
stringInput.addEventListener("input", scheduleLivePipeline);

examplePills.forEach((pill) => {
  pill.addEventListener("click", () => {
    regexInput.value = pill.dataset.regexExample || "";
    stringInput.value = pill.dataset.stringExample || "";
    runPipeline(1);
  });
});

pipelineSteps.forEach((step) => {
  step.addEventListener("click", () => {
    setActiveStage(Number(step.dataset.stageTarget));
  });
});

stageJumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    runPipeline(Number(button.dataset.stageJump));
  });
});

prevStageBtn.addEventListener("click", () => setActiveStage(Math.max(0, currentStageIndex - 1)));
nextStageBtn.addEventListener("click", () => setActiveStage(Math.min(stageMeta.length - 1, currentStageIndex + 1)));

window.addEventListener("load", () => runPipeline(0));

function scheduleLivePipeline() {
  if (liveInputTimer) {
    window.clearTimeout(liveInputTimer);
  }

  liveInputTimer = window.setTimeout(() => runPipeline(currentStageIndex), 180);
}

function runPipeline(targetStage = currentStageIndex) {
  clearSimulationTimer();
  simulationController = null;

  try {
    const regex = regexInput.value.trim();
    const input = stringInput.value;

    if (!regex) {
      throw new Error("Please enter a regular expression.");
    }

    const normalized = normalizeRegex(regex);
    const postfix = toPostfix(normalized);
    const nfa = buildThompsonNFA(postfix);
    const dfa = convertNfaToDfa(nfa);
    const completedDfa = completeDfa(dfa);
    const minimized = minimizeDfa(completedDfa);
    const equivalence = checkEquivalence(completedDfa, minimized);
    const comparisonRows = buildComparisonRows(completedDfa, minimized, input);
    const simulation = simulateDfa(completedDfa, input);

    alphabetValue.textContent = completedDfa.alphabet.length ? completedDfa.alphabet.join(", ") : "ε only";
    simulationBadge.textContent = simulation.accepted ? "Accepted" : "Rejected";
    simulationBadge.className = simulation.accepted ? "accept" : "reject";
    equivalenceBadge.textContent = equivalence.equivalent ? "Equivalent" : "Not Equivalent";
    equivalenceBadge.className = equivalence.equivalent ? "accept" : "reject";

    renderRegexStage(regex, normalized, postfix);
    renderNfaStage(nfa);
    renderDfaStage(completedDfa);
    renderMinStage(completedDfa, minimized);
    renderEqStage(equivalence, comparisonRows);
    renderSimulationStage(completedDfa, input, simulation);
    latestPipelineData = {
      regex,
      normalized,
      postfix,
      nfa,
      dfa: completedDfa,
      minimized,
      equivalence,
      comparisonRows,
      simulation,
      input,
    };
    renderInspector(latestPipelineData);
    renderSimulationDock(latestPipelineData);
    setActiveStage(targetStage);
  } catch (error) {
    renderError(error.message);
  }
}

function renderError(message) {
  clearSimulationTimer();
  simulationController = null;
  latestPipelineData = null;
  alphabetValue.textContent = "-";
  simulationBadge.textContent = "Error";
  simulationBadge.className = "reject";
  equivalenceBadge.textContent = "Unavailable";
  equivalenceBadge.className = "reject";

  Object.values(panels).forEach((panel) => {
    panel.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
  });

  simulationDockContent.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
  inspectorEqTable.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
  detailStage.textContent = "Unavailable";
  detailStates.textContent = "-";
  detailTransitions.textContent = "-";
  detailResult.textContent = "Error";
  detailHeading.textContent = "Pipeline error";
  detailBody.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
  setActiveStage(0, false);
}

function setActiveStage(index, updateButtons = true) {
  currentStageIndex = Math.max(0, Math.min(stageMeta.length - 1, index));
  stageSheets.forEach((sheet) => {
    sheet.classList.toggle("active", Number(sheet.dataset.stage) === currentStageIndex);
  });
  pipelineSteps.forEach((step) => {
    step.classList.toggle("active", Number(step.dataset.stageTarget) === currentStageIndex);
  });

  const currentMeta = stageMeta[currentStageIndex];
  canvasStageTitle.textContent = currentMeta.title;
  canvasStageBadge.textContent = currentMeta.badge;
  pipelineProgressBar.style.width = `${((currentStageIndex + 1) / stageMeta.length) * 100}%`;

  if (updateButtons) {
    prevStageBtn.disabled = currentStageIndex === 0;
    nextStageBtn.disabled = currentStageIndex === stageMeta.length - 1;
  }

  if (latestPipelineData) {
    updateInspectorForStage(currentStageIndex, latestPipelineData);
  }
}

function normalizeRegex(regex) {
  const compact = regex.replace(/\s+/g, "");

  if (!compact) {
    throw new Error("The regular expression becomes empty after removing spaces.");
  }

  const pieces = [];

  for (let i = 0; i < compact.length; i += 1) {
    const current = compact[i];
    const previous = compact[i - 1];

    if (!isValidToken(current)) {
      throw new Error(`Unsupported token "${current}" in the regular expression.`);
    }

    // Thompson construction expects explicit concatenation, so we insert "."
    // wherever concatenation is implied in the user's regex.
    if (i > 0 && needsConcat(previous, current)) {
      pieces.push(".");
    }

    pieces.push(current);
  }

  return pieces.join("");
}

function toPostfix(regex) {
  const output = [];
  const operators = [];
  const precedence = { "|": 1, ".": 2 };
  let balance = 0;

  for (const token of regex) {
    if (isLiteral(token)) {
      output.push(token);
      continue;
    }

    if (token === "(") {
      operators.push(token);
      balance += 1;
      continue;
    }

    if (token === ")") {
      balance -= 1;
      if (balance < 0) {
        throw new Error("Mismatched parentheses in the regular expression.");
      }

      while (operators.length && operators[operators.length - 1] !== "(") {
        output.push(operators.pop());
      }

      if (!operators.length) {
        throw new Error("Mismatched parentheses in the regular expression.");
      }

      operators.pop();
      continue;
    }

    if (isUnary(token)) {
      output.push(token);
      continue;
    }

    while (
      operators.length &&
      operators[operators.length - 1] !== "(" &&
      precedence[operators[operators.length - 1]] >= precedence[token]
    ) {
      output.push(operators.pop());
    }

    operators.push(token);
  }

  if (balance !== 0) {
    throw new Error("Mismatched parentheses in the regular expression.");
  }

  while (operators.length) {
    const op = operators.pop();
    if (op === "(") {
      throw new Error("Mismatched parentheses in the regular expression.");
    }
    output.push(op);
  }

  return output.join("");
}

function buildThompsonNFA(postfix) {
  let nextId = 0;
  const states = new Map();
  const alphabet = new Set();
  const stack = [];

  const createState = () => {
    const id = `q${nextId}`;
    nextId += 1;
    states.set(id, { id, transitions: [] });
    return id;
  };

  const addTransition = (from, symbol, to) => {
    states.get(from).transitions.push({ symbol, to });
  };

  const createLiteralFragment = (symbol) => {
    const start = createState();
    const accept = createState();
    addTransition(start, symbol, accept);
    alphabet.add(symbol);
    return { start, accept };
  };

  for (const token of postfix) {
    if (isLiteral(token)) {
      stack.push(createLiteralFragment(token));
      continue;
    }

    if (token === ".") {
      const right = stack.pop();
      const left = stack.pop();
      ensureFragments([left, right], token);
      addTransition(left.accept, "ε", right.start);
      stack.push({ start: left.start, accept: right.accept });
      continue;
    }

    if (token === "|") {
      const right = stack.pop();
      const left = stack.pop();
      ensureFragments([left, right], token);
      const start = createState();
      const accept = createState();
      addTransition(start, "ε", left.start);
      addTransition(start, "ε", right.start);
      addTransition(left.accept, "ε", accept);
      addTransition(right.accept, "ε", accept);
      stack.push({ start, accept });
      continue;
    }

    if (token === "*") {
      const fragment = stack.pop();
      ensureFragments([fragment], token);
      const start = createState();
      const accept = createState();
      addTransition(start, "ε", fragment.start);
      addTransition(start, "ε", accept);
      addTransition(fragment.accept, "ε", fragment.start);
      addTransition(fragment.accept, "ε", accept);
      stack.push({ start, accept });
      continue;
    }

    if (token === "+") {
      const fragment = stack.pop();
      ensureFragments([fragment], token);
      const start = createState();
      const accept = createState();
      addTransition(start, "ε", fragment.start);
      addTransition(fragment.accept, "ε", fragment.start);
      addTransition(fragment.accept, "ε", accept);
      stack.push({ start, accept });
      continue;
    }

    if (token === "?") {
      const fragment = stack.pop();
      ensureFragments([fragment], token);
      const start = createState();
      const accept = createState();
      addTransition(start, "ε", fragment.start);
      addTransition(start, "ε", accept);
      addTransition(fragment.accept, "ε", accept);
      stack.push({ start, accept });
      continue;
    }

    throw new Error(`Unexpected postfix token "${token}".`);
  }

  if (stack.length !== 1) {
    throw new Error("The regular expression could not be parsed into a valid automaton.");
  }

  const result = stack.pop();
  return {
    start: result.start,
    accept: result.accept,
    states,
    alphabet: [...alphabet].sort(),
  };
}

function convertNfaToDfa(nfa) {
  const alphabet = [...nfa.alphabet];
  // Each DFA state represents an epsilon-closure of one or more NFA states.
  const startClosure = epsilonClosure(new Set([nfa.start]), nfa);
  const startKey = setKey(startClosure);
  const states = new Map();
  const queue = [startClosure];
  const keyToId = new Map([[startKey, "D0"]]);
  let nextId = 1;

  states.set("D0", {
    id: "D0",
    nfaStates: [...startClosure].sort(),
    transitions: {},
    isAccept: startClosure.has(nfa.accept),
  });

  while (queue.length) {
    const currentSet = queue.shift();
    const currentKey = setKey(currentSet);
    const currentId = keyToId.get(currentKey);

    for (const symbol of alphabet) {
      const moved = moveFromSet(currentSet, symbol, nfa);
      if (!moved.size) {
        continue;
      }

      const closure = epsilonClosure(moved, nfa);
      const closureKey = setKey(closure);

      if (!keyToId.has(closureKey)) {
        const newId = `D${nextId}`;
        nextId += 1;
        keyToId.set(closureKey, newId);
        states.set(newId, {
          id: newId,
          nfaStates: [...closure].sort(),
          transitions: {},
          isAccept: closure.has(nfa.accept),
        });
        queue.push(closure);
      }

      states.get(currentId).transitions[symbol] = keyToId.get(closureKey);
    }
  }

  return {
    start: "D0",
    states,
    alphabet,
  };
}

function completeDfa(dfa) {
  const alphabet = [...dfa.alphabet];
  const states = new Map();

  dfa.states.forEach((state) => {
    states.set(state.id, {
      id: state.id,
      nfaStates: state.nfaStates ? [...state.nfaStates] : undefined,
      members: state.members ? [...state.members] : undefined,
      isAccept: state.isAccept,
      transitions: { ...state.transitions },
    });
  });

  let needsDeadState = false;

  states.forEach((state) => {
    alphabet.forEach((symbol) => {
      if (!state.transitions[symbol]) {
        needsDeadState = true;
      }
    });
  });

  if (needsDeadState) {
    states.set("Dead", {
      id: "Dead",
      members: ["Dead"],
      isAccept: false,
      transitions: {},
    });

    alphabet.forEach((symbol) => {
      states.get("Dead").transitions[symbol] = "Dead";
    });

    states.forEach((state) => {
      alphabet.forEach((symbol) => {
        if (!state.transitions[symbol]) {
          state.transitions[symbol] = "Dead";
        }
      });
    });
  }

  return {
    start: dfa.start,
    alphabet,
    states,
  };
}

function minimizeDfa(dfa) {
  const alphabet = [...dfa.alphabet];
  const allStates = [...dfa.states.values()];
  const accepting = allStates.filter((state) => state.isAccept).map((state) => state.id);
  const rejecting = allStates.filter((state) => !state.isAccept).map((state) => state.id);
  let partitions = [accepting, rejecting].filter((group) => group.length > 0).map((group) => group.sort());

  let changed = true;

  while (changed) {
    changed = false;
    const nextPartitions = [];

    for (const group of partitions) {
      // States stay together only if every transition goes to the same
      // partition under every alphabet symbol.
      const signatures = new Map();

      for (const stateId of group) {
        const state = dfa.states.get(stateId);
        const signature = alphabet
          .map((symbol) => findPartitionIndex(partitions, state.transitions[symbol]))
          .join("|");

        if (!signatures.has(signature)) {
          signatures.set(signature, []);
        }
        signatures.get(signature).push(stateId);
      }

      const splitGroups = [...signatures.values()].map((item) => item.sort());
      nextPartitions.push(...splitGroups);

      if (splitGroups.length > 1) {
        changed = true;
      }
    }

    partitions = nextPartitions;
  }

  const stateMap = new Map();
  const minimizedStates = new Map();

  partitions.forEach((group, index) => {
    const id = `M${index}`;
    group.forEach((member) => stateMap.set(member, id));
    minimizedStates.set(id, {
      id,
      members: [...group],
      isAccept: group.some((member) => dfa.states.get(member).isAccept),
      transitions: {},
    });
  });

  partitions.forEach((group, index) => {
    const representative = dfa.states.get(group[0]);
    const minState = minimizedStates.get(`M${index}`);
    alphabet.forEach((symbol) => {
      minState.transitions[symbol] = stateMap.get(representative.transitions[symbol]);
    });
  });

  return {
    start: stateMap.get(dfa.start),
    alphabet,
    states: minimizedStates,
    partitions,
  };
}

function checkEquivalence(dfaA, dfaB) {
  const alphabet = [...new Set([...dfaA.alphabet, ...dfaB.alphabet])].sort();
  const visited = new Set();
  const queue = [{ left: dfaA.start, right: dfaB.start, witness: "" }];

  while (queue.length) {
    const current = queue.shift();
    const pairKey = `${current.left}|${current.right}`;

    if (visited.has(pairKey)) {
      continue;
    }

    visited.add(pairKey);

    const leftState = dfaA.states.get(current.left);
    const rightState = dfaB.states.get(current.right);

    if (!!leftState.isAccept !== !!rightState.isAccept) {
      return {
        equivalent: false,
        witness: current.witness,
      };
    }

    // Product traversal searches for any witness string that separates
    // the two automata; if none exists, they are equivalent.
    alphabet.forEach((symbol) => {
      queue.push({
        left: leftState.transitions[symbol],
        right: rightState.transitions[symbol],
        witness: current.witness + symbol,
      });
    });
  }

  return {
    equivalent: true,
    witness: null,
  };
}

function simulateDfa(dfa, input) {
  const steps = [];
  let current = dfa.start;

  for (const symbol of input) {
    const state = dfa.states.get(current);
    const next = state.transitions[symbol];

    steps.push({
      current,
      symbol,
      next: next || "Dead",
      valid: !!next,
    });

    if (!next) {
      return { accepted: false, finalState: "Dead", steps };
    }

    current = next;
  }

  return {
    accepted: !!dfa.states.get(current)?.isAccept,
    finalState: current,
    steps,
  };
}

function buildSampleStrings(alphabet, preferredInput) {
  const strings = [""];
  const queue = [""];
  const maxDepth = 3;
  const limit = 12;

  while (queue.length && strings.length < limit && alphabet.length) {
    const current = queue.shift();

    if (current.length >= maxDepth) {
      continue;
    }

    alphabet.forEach((symbol) => {
      const next = current + symbol;
      strings.push(next);
      queue.push(next);
    });
  }

  if (!strings.includes(preferredInput)) {
    strings.push(preferredInput);
  }

  return [...new Set(strings)].slice(0, 12);
}

function buildComparisonRows(dfa, minimized, preferredInput) {
  const initialRows = buildSampleStrings(dfa.alphabet, preferredInput).map((sample) => {
    const dfaAccepted = simulateDfa(dfa, sample).accepted;
    const minAccepted = simulateDfa(minimized, sample).accepted;
    return { sample, dfaAccepted, minAccepted };
  });

  const hasAccept = initialRows.some((row) => row.dfaAccepted);
  const hasReject = initialRows.some((row) => !row.dfaAccepted);

  if (hasAccept && hasReject) {
    return initialRows;
  }

  const extraRows = [...initialRows];
  const seen = new Set(extraRows.map((row) => row.sample));
  const queue = [""];

  while (queue.length && extraRows.length < 16 && dfa.alphabet.length) {
    const current = queue.shift();
    if (current.length >= 4) {
      continue;
    }

    dfa.alphabet.forEach((symbol) => {
      const next = current + symbol;
      if (seen.has(next)) {
        return;
      }
      seen.add(next);
      queue.push(next);
      const dfaAccepted = simulateDfa(dfa, next).accepted;
      const minAccepted = simulateDfa(minimized, next).accepted;
      extraRows.push({ sample: next, dfaAccepted, minAccepted });
    });

    if (extraRows.some((row) => row.dfaAccepted) && extraRows.some((row) => !row.dfaAccepted)) {
      break;
    }
  }

  return extraRows.slice(0, 12);
}

function renderRegexStage(original, normalized, postfix) {
  panels.regex.innerHTML = `
    <div class="expression">${escapeHtml(original)}</div>
    <div class="summary-grid">
      <div class="mini-panel">
        <span class="mini-label">Normalized Regex</span>
        <strong>${escapeHtml(normalized)}</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">Postfix Form</span>
        <strong>${escapeHtml(postfix)}</strong>
      </div>
    </div>
    <div class="info-block">
      <span class="panel-label">Token Flow</span>
      <div class="token-ribbon">${tokenMarkup(postfix.split(""))}</div>
    </div>
  `;
}

function renderNfaStage(nfa) {
  panels.nfa.innerHTML = `
    ${renderAutomatonAnalysis({
      automaton: nfa,
      title: "Nondeterministic States",
      mappingTitle: "Transition Mapping",
      detailsTitle: "State Details",
      accentClass: "nfa-accent",
      mappingKind: "nfa",
    })}
  `;
}

function renderDfaStage(dfa) {
  panels.dfa.innerHTML = renderAutomatonAnalysis({
    automaton: dfa,
    title: "Deterministic States",
    mappingTitle: "Subset Mapping",
    detailsTitle: "State Details",
    accentClass: "dfa-accent",
    mappingKind: "subset",
  });
}

function renderMinStage(originalDfa, minimized) {
  panels.min.innerHTML = `
    <div class="comparison-head">
      <div class="mini-panel">
        <span class="mini-label">Before Minimization</span>
        <strong>${originalDfa.states.size} states</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">After Minimization</span>
        <strong>${minimized.states.size} states</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">Reduced By</span>
        <strong>${originalDfa.states.size - minimized.states.size} states</strong>
      </div>
    </div>
    ${renderAutomatonAnalysis({
      automaton: minimized,
      title: "Deterministic States",
      mappingTitle: "Subset Mapping",
      detailsTitle: "State Details",
      accentClass: "min-accent",
      mappingKind: "merged",
    })}
  `;
}

function renderEqStage(equivalence, rows) {
  const tableRows = rows
    .map((row) => `
      <tr>
        <td>${row.sample === "" ? "ε" : escapeHtml(row.sample)}</td>
        <td class="${row.dfaAccepted ? "accept" : "reject"}">${row.dfaAccepted ? "Accept" : "Reject"}</td>
        <td class="${row.minAccepted ? "accept" : "reject"}">${row.minAccepted ? "Accept" : "Reject"}</td>
        <td class="${row.dfaAccepted === row.minAccepted ? "match" : "mismatch"}">${row.dfaAccepted === row.minAccepted ? "Match" : "Mismatch"}</td>
      </tr>
    `)
    .join("");

  panels.eq.innerHTML = `
    <div class="summary-grid">
      <div class="mini-panel">
        <span class="mini-label">Formal Verdict</span>
        <strong class="${equivalence.equivalent ? "accept" : "reject"}">${equivalence.equivalent ? "Equivalent" : "Not Equivalent"}</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">Counterexample</span>
        <strong>${equivalence.witness === null ? "None" : equivalence.witness || "ε"}</strong>
      </div>
    </div>
    <div class="inline-note ${equivalence.equivalent ? "note-success" : ""}">
      ${equivalence.equivalent
        ? "Equivalent ✅ Reason: Both DFA and Min-DFA produce identical results for all tested strings."
        : `Not Equivalent ❌ Reason: The automata differ on witness string ${equivalence.witness || "ε"}.`}
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>String</th>
            <th>DFA Result</th>
            <th>Min-DFA Result</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function renderAutomatonAnalysis({ automaton, title, mappingTitle, detailsTitle, accentClass, mappingKind }) {
  const graphData = buildGraphData(automaton, mappingKind);
  const states = [...automaton.states.values()];
  const acceptingStates = states
    .filter((state) => (mappingKind === "nfa" ? state.id === automaton.accept : state.isAccept))
    .map((state) => state.id);
  const subsetMap = states
    .map((state) => {
      const members = state.nfaStates || state.members || [];
      const label = mappingKind === "merged" ? "Merged" : mappingKind === "nfa" ? "Transitions" : "Subset";
      const valueMarkup = mappingKind === "nfa"
        ? state.transitions.map((transition) => `${transition.symbol}→${transition.to}`).join(", ") || "No outgoing edges"
        : `{${members.join(", ") || state.id}}`;
      return `
        <div class="mapping-row">
          <strong>${escapeHtml(state.id)}</strong>
          <span>=</span>
          <code>${escapeHtml(valueMarkup)}</code>
          <small>${label}</small>
        </div>
      `;
    })
    .join("");

  const cards = states
    .map((state) => {
      const members = state.nfaStates || state.members || [];
      const isAccept = mappingKind === "nfa" ? state.id === automaton.accept : state.isAccept;
      const type = state.id === automaton.start ? "Start" : isAccept ? "Accepting" : "Normal";
      const transitionMarkup = normalizeTransitionList(state.transitions)
        .map((transition) => `<span class="token-pill">${escapeHtml(transition.symbol)} → ${escapeHtml(transition.to)}</span>`)
        .join("");
      return `
        <div class="state-detail-card ${state.id === automaton.start ? "starting" : ""} ${isAccept ? "accepting" : ""}" data-automaton-state="${escapeHtml(state.id)}">
          <div class="state-detail-head">
            <strong>${escapeHtml(state.id)}</strong>
            <span class="badge">${type}</span>
          </div>
          <div class="state-detail-line">
            <span class="mini-label">${mappingKind === "merged" ? "Merged Group" : mappingKind === "nfa" ? "State Role" : "Subset"}</span>
            <code>${mappingKind === "nfa" ? escapeHtml(type) : `{${escapeHtml(members.join(", ") || state.id)}}`}</code>
          </div>
          <div class="state-detail-line">
            <span class="mini-label">Transitions</span>
            <div class="token-ribbon">${transitionMarkup || '<span class="token-pill">No outgoing edges</span>'}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="automaton-split">
      <section class="automaton-graph-panel ${accentClass}">
        <div class="section-title-wrap">
          <span class="panel-label">${escapeHtml(title)}</span>
          <h3>Graph View</h3>
        </div>
        <div class="graph-legend">
          <div class="legend-item">
            <span class="legend-swatch legend-start">→</span>
            <span>Entry Arrow</span>
          </div>
          <div class="legend-item">
            <span class="legend-swatch legend-accept"></span>
            <span>Accept State</span>
          </div>
        </div>
        ${renderGraph(graphData.nodes, graphData.edges)}
      </section>
      <section class="automaton-detail-panel">
        <div class="summary-grid">
          <div class="mini-panel">
            <span class="mini-label">${escapeHtml(title)}</span>
            <strong>${states.length}</strong>
          </div>
          <div class="mini-panel">
            <span class="mini-label">Accepting States</span>
            <strong>${escapeHtml(acceptingStates.join(", ") || "None")}</strong>
          </div>
        </div>
        <div class="info-block">
          <div class="section-title-wrap">
            <span class="panel-label">${escapeHtml(mappingTitle)}</span>
            <h3>State Mapping</h3>
          </div>
          <div class="mapping-grid">${subsetMap}</div>
        </div>
        <div class="info-block">
          <div class="section-title-wrap">
            <span class="panel-label">${escapeHtml(detailsTitle)}</span>
            <h3>State Cards</h3>
          </div>
          <div class="state-detail-grid">${cards}</div>
        </div>
      </section>
    </div>
  `;
}

function renderInspector(data) {
  inspectorEqTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>String</th>
          <th>DFA</th>
          <th>Min-DFA</th>
        </tr>
      </thead>
      <tbody>
        ${data.comparisonRows
          .map((row) => `
            <tr>
              <td>${row.sample === "" ? "ε" : escapeHtml(row.sample)}</td>
              <td class="${row.dfaAccepted ? "accept" : "reject"}">${row.dfaAccepted ? "Accept" : "Reject"}</td>
              <td class="${row.minAccepted ? "accept" : "reject"}">${row.minAccepted ? "Accept" : "Reject"}</td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSimulationDock(data) {
  const simulation = data.simulation;
  const stepsMarkup = simulation.steps.length
    ? simulation.steps
        .map((step, index) => `
          <div class="step-card">
            <div class="panel-label">Transition ${index + 1}</div>
            <strong>${escapeHtml(step.current)} --${escapeHtml(step.symbol)}--> ${escapeHtml(step.next)}</strong>
          </div>
        `)
        .join("")
    : '<div class="inline-note">No transition steps are required for the empty string.</div>';

  simulationDockContent.innerHTML = `
    <div class="summary-grid">
      <div class="mini-panel">
        <span class="mini-label">Input String</span>
        <strong>${data.input === "" ? "ε" : escapeHtml(data.input)}</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">Verdict</span>
        <strong class="${simulation.accepted ? "accept" : "reject"}">${simulation.accepted ? "Accepted" : "Rejected"}</strong>
      </div>
    </div>
    <div class="inline-note ${simulation.accepted ? "note-success" : ""}">
      ${simulation.accepted
        ? `Accepted ✅ Reason: Final state ${simulation.finalState} is an accepting state.`
        : `Rejected ❌ Reason: Final state ${simulation.finalState} is not an accepting state.`}
    </div>
    <div class="step-grid">${stepsMarkup}</div>
  `;
}

function updateInspectorForStage(stageIndex, data) {
  const detailMap = [
    {
      title: "Regex",
      heading: "Regex overview",
      states: "-",
      transitions: "-",
      result: `Input length: ${data.input.length}`,
      body: [
        `Normalized form: ${data.normalized}`,
        `Postfix expression: ${data.postfix}`,
        `Alphabet extracted: ${data.dfa.alphabet.join(", ") || "ε"}`,
      ],
    },
    {
      title: "NFA",
      heading: "Thompson NFA details",
      states: data.nfa.states.size,
      transitions: countNfaTransitions(data.nfa),
      result: `Start ${data.nfa.start} → Accept ${data.nfa.accept}`,
      body: [
        `Built with Thompson fragments and epsilon links.`,
        `Start state: ${data.nfa.start}`,
        `Accept state: ${data.nfa.accept}`,
      ],
    },
    {
      title: "DFA",
      heading: "Subset construction details",
      states: data.dfa.states.size,
      transitions: countDfaTransitions(data.dfa),
      result: `${countAcceptingStates(data.dfa)} accepting states`,
      body: [
        `Each DFA state is an epsilon-closure of NFA states.`,
        `Dead state included: ${data.dfa.states.has("Dead") ? "Yes" : "No"}`,
        `Alphabet: ${data.dfa.alphabet.join(", ") || "ε"}`,
      ],
    },
    {
      title: "Minimized DFA",
      heading: "Partition refinement details",
      states: data.minimized.states.size,
      transitions: countDfaTransitions(data.minimized),
      result: `Reduced by ${data.dfa.states.size - data.minimized.states.size} states`,
      body: [
        `Equivalent DFA states were merged by partition refinement.`,
        `Partitions formed: ${data.minimized.partitions.length}`,
        `Start state: ${data.minimized.start}`,
      ],
    },
    {
      title: "Equivalence Check",
      heading: "Language comparison",
      states: `${data.dfa.states.size}/${data.minimized.states.size}`,
      transitions: `${countDfaTransitions(data.dfa)}/${countDfaTransitions(data.minimized)}`,
      result: data.equivalence.equivalent ? "Equivalent" : "Not Equivalent",
      body: [
        `Product traversal searched for a witness string.`,
        `Counterexample: ${data.equivalence.witness === null ? "None" : data.equivalence.witness || "ε"}`,
        `Sample strings tested: ${data.comparisonRows.length}`,
      ],
    },
    {
      title: "String Simulation",
      heading: "Execution trace",
      states: data.simulation.finalState,
      transitions: data.simulation.steps.length,
      result: data.simulation.accepted ? "Accepted" : "Rejected",
      body: [
        `Input processed: ${data.input === "" ? "ε" : data.input}`,
        `Final state: ${data.simulation.finalState}`,
        `Steps executed: ${data.simulation.steps.length}`,
      ],
    },
  ];

  const detail = detailMap[stageIndex];
  detailStage.textContent = detail.title;
  detailStates.textContent = detail.states;
  detailTransitions.textContent = detail.transitions;
  detailResult.textContent = detail.result;
  detailResult.className = detail.result.includes("Reject") || detail.result === "Not Equivalent" ? "reject" : detail.result === "Equivalent" || detail.result === "Accepted" ? "accept" : "";
  detailHeading.textContent = detail.heading;
  detailBody.innerHTML = detail.body.map((item) => `<div class="inspector-note">${escapeHtml(item)}</div>`).join("");
}

function renderSimulationStage(dfa, input, simulation) {
  const stateLane = [...dfa.states.values()]
    .map((state) => `
      <div class="sim-state ${state.id === dfa.start ? "starting" : ""} ${state.isAccept ? "accepting" : ""}" data-state="${escapeHtml(state.id)}">
        <strong>${escapeHtml(state.id)}</strong>
        <span>${state.isAccept ? "accept" : "state"}</span>
      </div>
    `)
    .join("");

  const characterTrack = input.length
    ? [...input]
        .map((symbol, index) => `
          <div class="char-chip" data-char-index="${index}">
            <span>${escapeHtml(symbol)}</span>
          </div>
        `)
        .join("")
    : `<div class="inline-note">Empty string input: the machine tests acceptance immediately at the start state.</div>`;

  const stepCards = simulation.steps.length
    ? simulation.steps
        .map((step, index) => `
          <button type="button" class="step-card sim-step-button" data-step="${index}">
            <div class="panel-label">Step ${index + 1}</div>
            <strong>${escapeHtml(step.current)} --${escapeHtml(step.symbol)}--> ${escapeHtml(step.next)}</strong>
          </button>
        `)
        .join("")
    : "";

  panels.sim.innerHTML = `
    <div class="summary-grid">
      <div class="mini-panel">
        <span class="mini-label">Input String</span>
        <strong>${input === "" ? "ε" : escapeHtml(input)}</strong>
      </div>
      <div class="mini-panel">
        <span class="mini-label">Result</span>
        <strong class="${simulation.accepted ? "accept" : "reject"}">${simulation.accepted ? "Accepted" : "Rejected"}</strong>
      </div>
    </div>
    <div class="inline-note ${simulation.accepted ? "note-success" : ""}">
      ${simulation.accepted
        ? `Accepted ✅ Reason: Final state ${simulation.finalState} is an accepting state.`
        : `Rejected ❌ Reason: Final state ${simulation.finalState} is not an accepting state.`}
    </div>
    <div class="live-console">
      <div class="sim-dashboard">
        <div class="sim-hero">
          <div>
            <span class="panel-label">Live Step Status</span>
            <h3 id="sim-step-title">Ready to simulate</h3>
            <p id="sim-step-copy" class="sim-copy">Press play or step through the string symbol by symbol.</p>
          </div>
          <div class="sim-pulse" id="sim-pulse"></div>
        </div>
        <div class="sim-control-row">
          <button type="button" class="sim-control primary" id="sim-play-btn">Play</button>
          <button type="button" class="sim-control" id="sim-pause-btn">Pause</button>
          <button type="button" class="sim-control" id="sim-next-btn">Next Step</button>
          <button type="button" class="sim-control" id="sim-reset-btn">Reset</button>
        </div>
        <div class="step-grid sim-metrics">
          <div class="mini-panel">
            <span class="mini-label">Input Symbol</span>
            <strong id="sim-current-symbol">${input[0] ? escapeHtml(input[0]) : "ε"}</strong>
          </div>
          <div class="mini-panel">
            <span class="mini-label">Next State</span>
            <strong id="sim-next-state">${simulation.steps[0] ? escapeHtml(simulation.steps[0].next) : escapeHtml(simulation.finalState)}</strong>
          </div>
        </div>
        <div class="sim-character-track" id="sim-character-track">${characterTrack}</div>
      </div>
      <div class="simulation-lane" id="sim-lane">${stateLane}</div>
    </div>
    <div class="step-grid">${stepCards || '<div class="inline-note">No transition steps are needed for the empty string.</div>'}</div>
  `;

  setupSimulationController(dfa, input, simulation);
}

function setupSimulationController(dfa, input, simulation) {
  simulationController = {
    dfa,
    input,
    simulation,
    currentStep: 0,
    isPlaying: false,
    stateElements: [...panels.sim.querySelectorAll(".sim-state")],
    stepElements: [...panels.sim.querySelectorAll(".sim-step-button")],
    charElements: [...panels.sim.querySelectorAll(".char-chip")],
    stepTitle: panels.sim.querySelector("#sim-step-title"),
    stepCopy: panels.sim.querySelector("#sim-step-copy"),
    pulse: panels.sim.querySelector("#sim-pulse"),
    currentSymbolEl: panels.sim.querySelector("#sim-current-symbol"),
    nextStateEl: panels.sim.querySelector("#sim-next-state"),
    playBtn: panels.sim.querySelector("#sim-play-btn"),
    pauseBtn: panels.sim.querySelector("#sim-pause-btn"),
    nextBtn: panels.sim.querySelector("#sim-next-btn"),
    resetBtn: panels.sim.querySelector("#sim-reset-btn"),
  };

  simulationController.playBtn.addEventListener("click", startSimulationPlayback);
  simulationController.pauseBtn.addEventListener("click", pauseSimulationPlayback);
  simulationController.nextBtn.addEventListener("click", advanceSimulationStep);
  simulationController.resetBtn.addEventListener("click", resetSimulationPlayback);

  simulationController.stepElements.forEach((element) => {
    element.addEventListener("click", () => {
      pauseSimulationPlayback();
      simulationController.currentStep = Number(element.dataset.step) + 1;
      updateSimulationUI();
    });
  });

  updateSimulationUI();

  if (simulation.steps.length) {
    startSimulationPlayback();
  }
}

function clearSimulationTimer() {
  if (simulationTimer) {
    window.clearInterval(simulationTimer);
    simulationTimer = null;
  }
}

function startSimulationPlayback() {
  if (!simulationController || simulationController.isPlaying || !simulationController.simulation.steps.length) {
    return;
  }

  if (simulationController.currentStep >= simulationController.simulation.steps.length) {
    simulationController.currentStep = 0;
    updateSimulationUI();
  }

  simulationController.isPlaying = true;
  updateSimulationUI();
  simulationTimer = window.setInterval(() => {
    const isDone = simulationController.currentStep >= simulationController.simulation.steps.length;

    if (isDone) {
      pauseSimulationPlayback();
      updateSimulationUI();
      return;
    }

    simulationController.currentStep += 1;
    updateSimulationUI();

    if (simulationController.currentStep >= simulationController.simulation.steps.length) {
      pauseSimulationPlayback();
      updateSimulationUI();
    }
  }, 950);
}

function pauseSimulationPlayback() {
  if (!simulationController) {
    return;
  }

  simulationController.isPlaying = false;
  clearSimulationTimer();
  updateSimulationUI();
}

function advanceSimulationStep() {
  if (!simulationController) {
    return;
  }

  pauseSimulationPlayback();

  if (simulationController.currentStep < simulationController.simulation.steps.length) {
    simulationController.currentStep += 1;
  }

  updateSimulationUI();
}

function resetSimulationPlayback() {
  if (!simulationController) {
    return;
  }

  pauseSimulationPlayback();
  simulationController.currentStep = 0;
  updateSimulationUI();
}

function updateSimulationUI() {
  if (!simulationController) {
    return;
  }

  const { dfa, input, simulation, currentStep, stateElements, stepElements, charElements } = simulationController;
  const activeStep = currentStep > 0 ? simulation.steps[currentStep - 1] : null;
  const currentState = activeStep ? activeStep.next : dfa.start;
  const nextPendingStep = simulation.steps[currentStep] || null;
  const nextState = nextPendingStep ? nextPendingStep.next : simulation.finalState;
  const currentSymbol = nextPendingStep ? nextPendingStep.symbol : "ε";
  const isComplete = currentStep >= simulation.steps.length;

  stateElements.forEach((element) => {
    const isActive = element.dataset.state === currentState;
    const isTrail = simulation.steps.slice(0, currentStep).some((step) => step.current === element.dataset.state || step.next === element.dataset.state);
    element.classList.toggle("active", isActive);
    element.classList.toggle("visited", isTrail && !isActive);
  });

  stepElements.forEach((element, index) => {
    element.classList.toggle("active", index === currentStep - 1);
    element.classList.toggle("visited", index < currentStep - 1);
  });

  charElements.forEach((element, index) => {
    element.classList.toggle("consumed", index < currentStep);
    element.classList.toggle("active", index === currentStep && !isComplete);
  });

  simulationController.currentSymbolEl.textContent = currentSymbol;
  simulationController.nextStateEl.textContent = nextState;
  syncAutomatonHighlights(currentState, simulation.steps.slice(0, currentStep));

  if (!simulation.steps.length) {
    simulationController.stepTitle.textContent = `Empty input accepted at ${simulation.finalState}`;
    simulationController.stepCopy.textContent = simulation.accepted
      ? "The DFA accepts immediately because the start state is accepting."
      : "The DFA rejects immediately because the start state is not accepting.";
  } else if (isComplete) {
    simulationController.stepTitle.textContent = `Simulation complete in ${simulation.steps.length} step${simulation.steps.length === 1 ? "" : "s"}`;
    simulationController.stepCopy.textContent = `Final state ${simulation.finalState} is ${simulation.accepted ? "accepting" : "rejecting"}, so the string is ${simulation.accepted ? "accepted" : "rejected"}.`;
  } else {
    simulationController.stepTitle.textContent = `Step ${currentStep + 1} of ${simulation.steps.length}`;
    simulationController.stepCopy.textContent = `Read "${nextPendingStep.symbol}" from ${nextPendingStep.current} and move to ${nextPendingStep.next}.`;
  }

  simulationController.pulse.classList.toggle("running", simulationController.isPlaying);
  simulationController.playBtn.disabled = simulationController.isPlaying || !simulation.steps.length;
  simulationController.pauseBtn.disabled = !simulationController.isPlaying;
  simulationController.nextBtn.disabled = isComplete || !simulation.steps.length;
  simulationController.resetBtn.disabled = currentStep === 0;
}

function syncAutomatonHighlights(activeState, traversedSteps) {
  const visitedStates = new Set();
  traversedSteps.forEach((step) => {
    visitedStates.add(step.current);
    visitedStates.add(step.next);
  });

  document.querySelectorAll("[data-automaton-state]").forEach((element) => {
    const stateId = element.dataset.automatonState;
    element.classList.toggle("is-live-state", stateId === activeState);
    element.classList.toggle("is-live-trace", visitedStates.has(stateId) && stateId !== activeState);
  });
}

function stateMarkup({ id, transitions, isAccept, isStart, description = "" }) {
  const transitionList = transitions.length
    ? transitions
        .map((item) => `
          <li class="transition-item">
            <strong>${escapeHtml(item.symbol)}</strong> → ${escapeHtml(item.to)}
          </li>
        `)
        .join("")
    : `<li class="transition-item">No outgoing transitions</li>`;

  return `
    <div class="state-card ${isAccept ? "accepting" : ""} ${isStart ? "starting" : ""}">
      <div class="state-title">
        <strong>${escapeHtml(id)}</strong>
        <span class="badge">${isAccept ? "Accept" : "State"}${isStart ? " • Start" : ""}</span>
      </div>
      ${description ? `<div class="inline-note">${description}</div>` : ""}
      <ul class="transition-list">${transitionList}</ul>
    </div>
  `;
}

function renderGraph(nodes, edges) {
  const width = 720;
  const height = 420;
  const nodeRadius = 28;
  const arrowDepth = 12;
  const edgeOffset = nodeRadius + arrowDepth - 2;
  const markerSuffix = `graph-${Math.random().toString(36).slice(2, 10)}`;
  const defaultMarkerId = `${markerSuffix}-arrowhead`;
  const startMarkerId = `${markerSuffix}-arrowhead-start`;
  const positions = computeForceDirectedLayout(nodes, edges, width, height);

  const edgeGroups = new Map();
  edges.forEach((edge) => {
    const key = `${edge.from}->${edge.to}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key).push(edge);
  });

  const edgeMarkup = edges
    .map((edge, index) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);

      if (!from || !to) {
        return "";
      }

      if (edge.isStartArrow) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const endX = to.x - (dx / distance) * (nodeRadius + arrowDepth + 4);
        const endY = to.y - (dy / distance) * (nodeRadius + arrowDepth + 4);
        return `
          <g class="graph-edge graph-start-edge">
            <path marker-end="url(#${startMarkerId})" d="M ${from.x} ${from.y} L ${endX} ${endY}" />
          </g>
        `;
      }

      if (edge.from === edge.to) {
        const loopX = from.x;
        const loopY = from.y - 44;
        return `
          <g class="graph-edge self-loop">
            <path marker-end="url(#${defaultMarkerId})" d="M ${from.x - 20} ${from.y - 14} C ${from.x - 56} ${from.y - 86}, ${from.x + 56} ${from.y - 86}, ${from.x + 20} ${from.y - 14}" />
            <text class="graph-edge-label" x="${loopX}" y="${loopY}" text-anchor="middle">${escapeHtml(edge.symbol)}</text>
          </g>
        `;
      }

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const startX = from.x + (dx / distance) * nodeRadius;
      const startY = from.y + (dy / distance) * nodeRadius;
      const endX = to.x - (dx / distance) * edgeOffset;
      const endY = to.y - (dy / distance) * edgeOffset;
      const group = edgeGroups.get(`${edge.from}->${edge.to}`) || [edge];
      const groupIndex = group.indexOf(edge);
      const groupCenterOffset = groupIndex - (group.length - 1) / 2;
      const perpendicularX = -dy / distance;
      const perpendicularY = dx / distance;
      const bend = (group.length > 1 ? 28 : 16) * groupCenterOffset || (index % 2 === 0 ? -12 : 12);
      const midX = (startX + endX) / 2 + perpendicularX * bend;
      const midY = (startY + endY) / 2 + perpendicularY * bend;

      return `
        <g class="graph-edge">
          <path marker-end="url(#${defaultMarkerId})" d="M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}" />
          <text class="graph-edge-label" x="${midX}" y="${midY - 8}" text-anchor="middle">${escapeHtml(edge.symbol)}</text>
        </g>
      `;
    })
    .join("");

  const nodeMarkup = nodes
    .map((node) => {
      const pos = positions.get(node.id);
      return `
        <g class="graph-node ${node.isStart ? "starting" : ""} ${node.isAccept ? "accepting" : ""} ${node.isDummy ? "dummy" : ""}" ${node.isDummy ? "" : `data-automaton-state="${escapeHtml(node.id)}"`} transform="translate(${pos.x}, ${pos.y})">
          ${node.isStart ? '<circle class="start-ring" r="34"></circle>' : ""}
          <circle class="node-core" r="${node.isDummy ? 1 : 28}"></circle>
          ${node.isAccept ? '<circle class="accept-ring" r="22"></circle>' : ""}
          ${node.isDummy ? "" : `<text text-anchor="middle" dy="5">${escapeHtml(node.label)}</text>`}
        </g>
      `;
    })
    .join("");

  return `
    <div class="graph-shell">
      <svg viewBox="0 0 ${width} ${height}" class="automaton-graph" role="img" aria-label="Automaton graph">
        <defs>
          <marker id="${defaultMarkerId}" markerWidth="12" markerHeight="12" refX="10.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0, 10 3.5, 0 7" class="graph-arrow"></polygon>
          </marker>
          <marker id="${startMarkerId}" markerWidth="12" markerHeight="12" refX="10.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0, 10 3.5, 0 7" class="graph-arrow graph-arrow-start"></polygon>
          </marker>
        </defs>
        <g class="graph-edge-layer">${edgeMarkup}</g>
        <g class="graph-node-layer">${nodeMarkup}</g>
      </svg>
    </div>
  `;
}

function tokenMarkup(tokens) {
  return tokens
    .map((token) => `<span class="token-pill">${escapeHtml(token)}</span>`)
    .join("");
}

function objectTransitions(transitions) {
  return Object.entries(transitions).map(([symbol, to]) => ({ symbol, to }));
}

function normalizeTransitionList(transitions) {
  if (Array.isArray(transitions)) {
    return transitions.map((transition) => ({
      symbol: transition.symbol,
      to: transition.to,
    }));
  }

  return Object.entries(transitions || {}).map(([symbol, to]) => ({ symbol, to }));
}

function buildGraphData(automaton, mappingKind) {
  const nodes = [...automaton.states.values()].map((state) => ({
    id: state.id,
    label: state.id,
    isStart: state.id === automaton.start,
    isAccept: mappingKind === "nfa" ? state.id === automaton.accept : !!state.isAccept,
  }));

  const startGuideNode = {
    id: "__start__",
    label: "",
    isStart: false,
    isAccept: false,
    isDummy: true,
    fixedTo: automaton.start,
  };

  const edges = [...automaton.states.values()].flatMap((state) =>
    normalizeTransitionList(state.transitions).map((transition) => ({
      from: state.id,
      to: transition.to,
      label: transition.symbol,
      symbol: transition.symbol,
    }))
  );

  edges.unshift({
    from: "__start__",
    to: automaton.start,
    label: "start",
    symbol: "start",
    isStartArrow: true,
  });

  return { nodes: [startGuideNode, ...nodes], edges };
}

function computeForceDirectedLayout(nodes, edges, width, height) {
  const positions = new Map();
  const velocities = new Map();
  const centerX = width / 2;
  const centerY = height / 2;
  const visibleNodes = nodes.filter((node) => !node.isDummy);
  const baseRadius = Math.min(140, 70 + visibleNodes.length * 7);
  const nodeRadius = 28;

  visibleNodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(visibleNodes.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + baseRadius * Math.cos(angle),
      y: centerY + baseRadius * Math.sin(angle),
    });
    velocities.set(node.id, { x: 0, y: 0 });
  });
  const idealDistance = Math.max(110, Math.min(170, 540 / Math.max(nodes.length, 3)));
  const repulsion = 8000;
  const springStrength = 0.018;
  const centering = 0.008;
  const damping = 0.82;

  for (let step = 0; step < 220; step += 1) {
    const forces = new Map(visibleNodes.map((node) => [node.id, { x: 0, y: 0 }]));

    for (let i = 0; i < visibleNodes.length; i += 1) {
      for (let j = i + 1; j < visibleNodes.length; j += 1) {
        const a = positions.get(visibleNodes[i].id);
        const b = positions.get(visibleNodes[j].id);
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distanceSq = Math.max(dx * dx + dy * dy, 0.01);
        const distance = Math.sqrt(distanceSq);
        dx /= distance;
        dy /= distance;
        const force = repulsion / distanceSq;
        forces.get(visibleNodes[i].id).x -= dx * force;
        forces.get(visibleNodes[i].id).y -= dy * force;
        forces.get(visibleNodes[j].id).x += dx * force;
        forces.get(visibleNodes[j].id).y += dy * force;
      }
    }

    edges.forEach((edge) => {
      if (edge.from === edge.to || edge.isStartArrow) {
        return;
      }

      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) {
        return;
      }

      let dx = to.x - from.x;
      let dy = to.y - from.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      dx /= distance;
      dy /= distance;
      const springForce = (distance - idealDistance) * springStrength;
      forces.get(edge.from).x += dx * springForce;
      forces.get(edge.from).y += dy * springForce;
      forces.get(edge.to).x -= dx * springForce;
      forces.get(edge.to).y -= dy * springForce;
    });

    visibleNodes.forEach((node) => {
      const position = positions.get(node.id);
      const velocity = velocities.get(node.id);
      const force = forces.get(node.id);
      force.x += (centerX - position.x) * centering;
      force.y += (centerY - position.y) * centering;

      velocity.x = (velocity.x + force.x) * damping;
      velocity.y = (velocity.y + force.y) * damping;
      position.x = clamp(position.x + velocity.x, nodeRadius + 24, width - nodeRadius - 24);
      position.y = clamp(position.y + velocity.y, nodeRadius + 24, height - nodeRadius - 24);
    });
  }

  nodes.filter((node) => node.isDummy && node.fixedTo).forEach((node) => {
    const anchor = positions.get(node.fixedTo);
    if (!anchor) {
      positions.set(node.id, { x: 48, y: centerY });
      return;
    }
    positions.set(node.id, {
      x: Math.max(20, anchor.x - 86),
      y: anchor.y,
    });
  });

  return positions;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function epsilonClosure(initialSet, nfa) {
  const stack = [...initialSet];
  const closure = new Set(initialSet);

  while (stack.length) {
    const stateId = stack.pop();
    const state = nfa.states.get(stateId);

    state.transitions.forEach((transition) => {
      if (transition.symbol === "ε" && !closure.has(transition.to)) {
        closure.add(transition.to);
        stack.push(transition.to);
      }
    });
  }

  return closure;
}

function moveFromSet(stateSet, symbol, nfa) {
  const result = new Set();

  stateSet.forEach((stateId) => {
    const state = nfa.states.get(stateId);
    state.transitions.forEach((transition) => {
      if (transition.symbol === symbol) {
        result.add(transition.to);
      }
    });
  });

  return result;
}

function setKey(set) {
  return [...set].sort().join(",");
}

function findPartitionIndex(partitions, stateId) {
  return partitions.findIndex((group) => group.includes(stateId));
}

function countNfaTransitions(nfa) {
  return [...nfa.states.values()].reduce((total, state) => total + state.transitions.length, 0);
}

function countDfaTransitions(dfa) {
  return [...dfa.states.values()].reduce((total, state) => total + Object.keys(state.transitions).length, 0);
}

function countAcceptingStates(dfa) {
  return [...dfa.states.values()].filter((state) => state.isAccept).length;
}

function ensureFragments(fragments, operator) {
  if (fragments.some((fragment) => !fragment)) {
    throw new Error(`Operator "${operator}" does not have enough operands.`);
  }
}

function isLiteral(char) {
  return /[a-zA-Z0-9]/.test(char);
}

function isUnary(char) {
  return char === "*" || char === "+" || char === "?";
}

function isValidToken(char) {
  return isLiteral(char) || ["(", ")", "|", "*", "+", "?"].includes(char);
}

function needsConcat(previous, current) {
  const left = isLiteral(previous) || previous === ")" || isUnary(previous);
  const right = isLiteral(current) || current === "(";
  return left && right;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
