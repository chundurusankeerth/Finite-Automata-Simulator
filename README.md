# 🤖 Automata Workflow Console

A comprehensive, interactive **regular expression to automata transformation and simulation** tool. Visualize the complete pipeline from regex patterns through NFA, DFA, minimized DFA, equivalence checking, and live string simulation.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **📐 Regex Input** – Enter any regular expression and see it processed
- **🔀 Thompson Construction** – Convert regex patterns to NFA (Non-deterministic Finite Automata)
- **⚙️ Subset Construction** – Transform NFA into equivalent DFA (Deterministic Finite Automata)
- **🔧 Partition Refinement** – Minimize DFA to its simplest form using partition refinement algorithm
- **🔍 Equivalence Checking** – Compare automata states and verify behavioral equivalence
- **⚡ Live Simulation** – Test input strings against your automata with step-by-step execution trace
- **📊 Visual Pipeline** – Watch each transformation stage with detailed state diagrams
- **🎯 Quick Examples** – Load preset regex patterns for rapid experimentation
- **📱 Responsive Design** – Works seamlessly on desktop and tablet devices

## 🚀 Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- No additional dependencies required (vanilla JavaScript)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/chundurusankeerth/Finite-Automata-Simulator.git
cd Finite-Automata-Simulator
```

2. Open in your browser:
```bash
# Option 1: Direct file opening
open index.html

# Option 2: Using a local server (recommended)
python -m http.server 8000
# Then visit http://localhost:8000
```

## 💡 How to Use

### Basic Workflow

1. **Enter a Regular Expression** – Type your pattern in the "Regular Expression" field
   - Example: `(a|b)*abb`

2. **Provide a Test String** – Enter a string to match against
   - Example: `aabb`

3. **Navigate the Pipeline** – Click on any stage (NFA, DFA, Min-DFA, etc.) to view that transformation

4. **Run Simulation** – Jump to the Simulation stage to see step-by-step execution with:
   - Current state
   - Symbols consumed
   - Transitions taken
   - Final acceptance/rejection result

5. **Check Equivalence** – The system automatically verifies if different automata representations are equivalent

### Preset Examples

Quick-load patterns to explore:
- `(a|b)*abb` – Accept strings ending in "abb"
- `a*b(a|b)` – Match "ab" or "bb" patterns
- `ab?c+` – Optional "b" with one or more "c"s
- `(0|1)*101` – Binary strings ending in "101"

## 🏗️ Project Structure

```
Finite-Automata-Simulator/
├── index.html          # Main HTML interface
├── script.js           # Pipeline logic & algorithms (1700+ lines)
├── style.css           # Modern glassmorphic styling
└── README.md           # This file
```

## 🔧 Core Algorithms

The simulator implements several key automata theory algorithms:

### Thompson Construction
Converts regular expressions into NFAs using Thompson's algorithm, building automata from basic components with epsilon transitions.

### Subset Construction
Transforms NFAs into equivalent DFAs by tracking sets of NFA states, eliminating non-determinism.

### Partition Refinement
Minimizes DFAs by iteratively grouping states that have equivalent behavior, reducing the automata size while preserving language acceptance.

### Equivalence Checking
Compares two automata to verify they accept the same language using cross-product construction and reachability analysis.

## 🎨 User Interface

Built with a modern **glassmorphic design** featuring:
- Smooth gradient backgrounds
- Ambient light effects
- Glass-morphism panels
- Smooth animations and transitions
- Real-time input processing
- Detailed state and transition visualization

## ⌨️ Controls

| Action | Method |
|--------|--------|
| Load Preset | Click example pill buttons |
| Change Stage | Click pipeline steps or use prev/next buttons |
| Run Simulation | Navigate to "Simulation" stage |
| Update Regex | Edit the input field (auto-processes after 180ms) |
| Test String | Enter in the test string field |

## 📊 Output Information

For each automata stage, you'll see:
- **States** – Complete list of all states and their properties
- **Transitions** – All state transitions with input symbols
- **Acceptance Criteria** – Which states are accepting/final
- **Simulation Result** – Whether the test string is accepted

## 🔬 Advanced Features

- **Live Pipeline** – Input changes auto-trigger re-computation (debounced)
- **Multi-Stage Visualization** – View multiple automata representations simultaneously
- **Detailed Inspection** – Hover over states and transitions for detailed information
- **Error Handling** – Clear error messages for invalid regex patterns
- **Trace Execution** – Follow the exact path taken during string simulation

## 📝 Supported Regex Features

- Alternation: `a|b`
- Concatenation: `ab`
- Kleene Star: `a*`
- Plus: `a+`
- Optional: `a?`
- Grouping: `(a|b)*`
- Complex patterns: `(a|b)*abb`, `(0|1)*101`, etc.

## 🐛 Troubleshooting

### Invalid Regex Error
Ensure your regex uses correct syntax:
- Use `|` for alternation (not `+` for OR)
- Parentheses must be balanced
- Use `*`, `+`, `?` as postfix operators

### Simulation Not Running
- Enter a test string
- Ensure the regex is valid
- Click on the Simulation stage

### Browser Performance
For complex regexes with many states:
- Try simpler test strings first
- Use a modern browser (Chrome, Firefox, Safari)

## 📚 Educational Value

This tool is perfect for:
- Learning automata theory fundamentals
- Understanding regex-to-automata conversion
- Visualizing NFA/DFA transformations
- Exploring state minimization algorithms
- Verifying theoretical concepts with practical examples

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or suggest features
- Optimize algorithms
- Improve UI/UX
- Expand regex support

## 📄 License

This project is licensed under the MIT License – see the LICENSE file for details.

## 🎓 References

- Thompson, K. "Regular Expression Search Algorithm." *Communications of the ACM*, 1968
- Hopcroft, J. & Ullman, J. "Introduction to Automata Theory, Languages, and Computation"
- DFA Minimization: Partition Refinement Algorithm (Hopcroft's Algorithm)

## 👨‍💻 Author

Created as an educational tool for Theory of Computation coursework.

---

**Try it now:** Open `index.html` in your browser and explore the fascinating world of automata theory!