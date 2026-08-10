// Practice quiz question bank.
// Categories: fundamentals, manual, automation, api, agile, performance
window.QUIZ_QUESTIONS = [
  {
    category: "fundamentals",
    difficulty: "easy",
    question: "Which of the following BEST defines a defect?",
    choices: [
      "A mistake made by a developer while coding",
      "A deviation from the expected behavior of the system",
      "Any change requested by the customer",
      "A missing requirement in the specification"
    ],
    answer: 1,
    explanation: "A defect (or bug) is a flaw in a component or system that can cause it to fail to perform its required function. It is a deviation from expected behavior. A mistake in code is an 'error'; a defect is what the error produces."
  },
  {
    category: "fundamentals",
    difficulty: "easy",
    question: "What is the primary purpose of a test case?",
    choices: [
      "To automate a repetitive task",
      "To document a bug that was found",
      "To specify inputs, preconditions, and expected results to verify a requirement",
      "To measure code coverage"
    ],
    answer: 2,
    explanation: "A test case defines preconditions, inputs, steps, and expected results, used to verify that a specific requirement or scenario works correctly."
  },
  {
    category: "fundamentals",
    difficulty: "easy",
    question: "Which testing level focuses on individual functions or methods in isolation?",
    choices: ["Integration testing", "Unit testing", "System testing", "Acceptance testing"],
    answer: 1,
    explanation: "Unit testing validates the smallest testable parts (functions, methods, classes) in isolation — usually written by developers."
  },
  {
    category: "fundamentals",
    difficulty: "medium",
    question: "Which of these is NOT one of the seven ISTQB principles of testing?",
    choices: [
      "Testing shows the presence of defects, not their absence",
      "Exhaustive testing is impossible",
      "Early testing saves time and money",
      "Automated tests always find more bugs than manual tests"
    ],
    answer: 3,
    explanation: "The seven principles include 'testing shows presence of defects', 'exhaustive testing is impossible', 'early testing', 'defect clustering', 'pesticide paradox', 'testing is context dependent', and 'absence of errors is a fallacy'. Automation vs. manual effectiveness is not one of them."
  },
  {
    category: "manual",
    difficulty: "easy",
    question: "What is the difference between smoke testing and sanity testing?",
    choices: [
      "There is no difference; they are the same thing",
      "Smoke checks broad, critical functionality after a build; sanity checks specific narrow functionality after minor changes",
      "Sanity is done before smoke testing",
      "Smoke is scripted; sanity is exploratory"
    ],
    answer: 1,
    explanation: "Smoke testing is a broad, shallow build-verification test. Sanity testing is a narrow, deep test of specific functionality after a small change or bug fix."
  },
  {
    category: "manual",
    difficulty: "medium",
    question: "You are given a login field that accepts 1-20 characters. Using boundary value analysis, which values should you test?",
    choices: [
      "1, 10, 20",
      "0, 1, 20, 21",
      "1, 20, 100",
      "5, 15, 25"
    ],
    answer: 1,
    explanation: "Boundary value analysis tests values at the edges: just below the minimum (0), the minimum (1), the maximum (20), and just above the maximum (21)."
  },
  {
    category: "manual",
    difficulty: "medium",
    question: "Which technique groups inputs that should be treated the same by the system?",
    choices: [
      "Decision table testing",
      "Boundary value analysis",
      "Equivalence partitioning",
      "State transition testing"
    ],
    answer: 2,
    explanation: "Equivalence partitioning divides inputs into classes where the system behaves the same, so testing one value per class is enough."
  },
  {
    category: "manual",
    difficulty: "hard",
    question: "A P1/S1 bug is best described as:",
    choices: [
      "Cosmetic bug that must be fixed before release",
      "Blocks core functionality with no workaround — needs immediate fix",
      "A bug found in production only",
      "A bug that affects only one user"
    ],
    answer: 1,
    explanation: "Priority 1 / Severity 1 typically indicates a critical, blocking issue with no workaround, requiring immediate attention."
  },
  {
    category: "automation",
    difficulty: "easy",
    question: "Which of these is NOT a good candidate for automation?",
    choices: [
      "Regression tests run on every build",
      "Exploratory testing of a brand-new feature",
      "Data-driven tests with many input combinations",
      "Smoke tests"
    ],
    answer: 1,
    explanation: "Exploratory testing depends on human observation, intuition, and adaptability — poor candidates for automation. Repetitive, stable, high-value tests automate well."
  },
  {
    category: "automation",
    difficulty: "medium",
    question: "In the Page Object Model (POM), what is the main benefit?",
    choices: [
      "It runs tests faster",
      "It separates test logic from page structure, making tests easier to maintain",
      "It removes the need for locators",
      "It automatically retries flaky tests"
    ],
    answer: 1,
    explanation: "POM encapsulates page elements and interactions in a class, so when the UI changes, you update one place instead of every test."
  },
  {
    category: "automation",
    difficulty: "medium",
    question: "Which locator strategy is generally the MOST resilient to UI changes?",
    choices: [
      "Absolute XPath",
      "CSS class name",
      "data-testid or ARIA role",
      "Element index (nth-child)"
    ],
    answer: 2,
    explanation: "Test-specific attributes like data-testid, or semantic queries like ARIA role/label, are the most stable because they are designed to identify elements independently of styling or DOM structure."
  },
  {
    category: "automation",
    difficulty: "hard",
    question: "A test intermittently fails because it clicks a button before the modal is fully rendered. The BEST fix is:",
    choices: [
      "Add a fixed sleep of 3 seconds",
      "Retry the whole test on failure",
      "Wait explicitly for the modal to be visible/enabled before clicking",
      "Disable the test until it stabilizes"
    ],
    answer: 2,
    explanation: "Explicit waits for a condition (element visible, network idle, etc.) are the correct fix for flakiness caused by timing. Fixed sleeps are slow and still flaky."
  },
  {
    category: "api",
    difficulty: "easy",
    question: "Which HTTP status code indicates 'resource created successfully'?",
    choices: ["200", "201", "204", "301"],
    answer: 1,
    explanation: "201 Created is returned when a request has succeeded and led to the creation of a resource. 200 is generic success; 204 is no content; 301 is permanent redirect."
  },
  {
    category: "api",
    difficulty: "easy",
    question: "Which HTTP method is idempotent — calling it multiple times has the same effect as calling it once?",
    choices: ["POST", "PUT", "PATCH (always)", "None of the above"],
    answer: 1,
    explanation: "PUT is defined as idempotent — a full replacement produces the same state each time. POST is not idempotent; PATCH is not required to be."
  },
  {
    category: "api",
    difficulty: "medium",
    question: "You call POST /users with a duplicate email that already exists. Which status code is MOST appropriate?",
    choices: ["400 Bad Request", "409 Conflict", "500 Internal Server Error", "404 Not Found"],
    answer: 1,
    explanation: "409 Conflict specifically indicates the request could not be completed due to a conflict with the current state of the resource — a duplicate is a classic example."
  },
  {
    category: "api",
    difficulty: "hard",
    question: "When testing an API, why should you assert on the response schema and not just the values?",
    choices: [
      "Schema checks are faster",
      "It catches breaking changes to the contract even when your specific data still 'looks right'",
      "It's required by REST",
      "Values are always dynamic and can't be asserted"
    ],
    answer: 1,
    explanation: "Schema/contract validation catches structural regressions (a missing field, a wrong type) that value-only assertions miss — protecting consumers from broken contracts."
  },
  {
    category: "agile",
    difficulty: "easy",
    question: "In Scrum, when should regression testing occur?",
    choices: [
      "Only at the end of the release",
      "Only when a bug is fixed",
      "Continuously throughout each sprint",
      "Only after user acceptance testing"
    ],
    answer: 2,
    explanation: "In Agile, regression is a continuous activity — every change risks breaking existing functionality, so automated regression should run frequently."
  },
  {
    category: "agile",
    difficulty: "medium",
    question: "What is the 'Definition of Done' primarily used for?",
    choices: [
      "A checklist for the product owner to sign off requirements",
      "A shared understanding of when a user story is truly complete, including testing and documentation",
      "A list of features remaining in the backlog",
      "The team's velocity for the sprint"
    ],
    answer: 1,
    explanation: "DoD is a shared team agreement about the criteria — code review, tests passing, documentation, deployed to a stage — that must be met before a story is done."
  },
  {
    category: "agile",
    difficulty: "medium",
    question: "What does 'shift-left' testing mean?",
    choices: [
      "Moving tests to run on the left monitor",
      "Testing earlier in the SDLC — during design and development, not just after",
      "Running tests only on left-navigation pages",
      "Prioritizing UI tests over API tests"
    ],
    answer: 1,
    explanation: "Shift-left means involving testing earlier — reviewing requirements, contributing to design, writing tests alongside code — to find defects when they are cheapest to fix."
  },
  {
    category: "performance",
    difficulty: "easy",
    question: "Which type of performance test finds the maximum capacity a system can handle before failing?",
    choices: ["Load testing", "Stress testing", "Spike testing", "Soak testing"],
    answer: 1,
    explanation: "Stress testing pushes the system beyond its expected limits to find the breaking point. Load testing verifies expected load; spike tests sudden bursts; soak tests sustained load."
  },
  {
    category: "performance",
    difficulty: "medium",
    question: "In performance testing, what is 'throughput'?",
    choices: [
      "The time from request to response",
      "The number of requests handled per unit of time",
      "The number of concurrent users",
      "CPU utilization percentage"
    ],
    answer: 1,
    explanation: "Throughput measures work done per unit of time (requests/sec, transactions/min). Response time and concurrent users are separate metrics."
  },
  {
    category: "fundamentals",
    difficulty: "medium",
    question: "What is 'traceability' in QA?",
    choices: [
      "The ability to trace a bug back to the developer who introduced it",
      "The ability to link requirements to test cases (and defects) so you can prove coverage",
      "Recording every action a user takes",
      "Analyzing browser network traces"
    ],
    answer: 1,
    explanation: "A traceability matrix maps requirements → test cases → defects, showing which requirements are covered and where gaps exist."
  },
  {
    category: "fundamentals",
    difficulty: "hard",
    question: "You are asked to test a feature but have no requirements. What is the BEST first action?",
    choices: [
      "Refuse to test until requirements are provided",
      "Write test cases from your assumptions and start executing",
      "Perform exploratory testing while collaborating with PM/devs to clarify expected behavior, then document",
      "Skip the feature and move on"
    ],
    answer: 2,
    explanation: "Explore the feature to understand it, ask clarifying questions of the PM/devs/designers, and capture the shared understanding as you go. Testing without any oracle is impossible, but requirements can be built collaboratively."
  }
];
