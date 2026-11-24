/**
 * Build lab: hands-on tasks you do on your own laptop, in one GitHub repo (swe-lab), one folder per task.
 * pyforge checks the repo through GitHub's public API and grades your reflection, so it can track
 * what you've actually built. Chosen from what 2026 new grad postings and hiring reports emphasize:
 * cloud, AI engineering (LLM APIs, RAG, agents, MCP, evals), and reading and checking code, AI written code included.
 */

export type TrackId = 'core' | 'systems' | 'backend' | 'cloud' | 'ai' | 'craft';

export interface LabCheck { label: string; path: RegExp }
export interface LabTask {
  id: string;
  n: number;
  track: TrackId;
  title: string;
  mins: number;
  folder: string;
  why: string;
  build: string[];
  checks: LabCheck[];
  ci?: boolean; // also needs a green GitHub Actions run
  learn: { label: string; url: string }[];
  reflect: string[];
  interview: string[];
  resume?: string;
  needs?: string[];
}

export const TRACKS: Record<TrackId, { name: string; blurb: string }> = {
  core: { name: 'Engineering foundations', blurb: 'Git, the shell, tests and SQL: what every team assumes you know on day one.' },
  systems: { name: 'Performance and systems', blurb: 'Concurrency, networking and profiling: the "under the hood" depth HRT, Citadel and Jane Street onsites probe.' },
  backend: { name: 'Backend services', blurb: 'Build and ship a real API with a database, the way most new grad work looks.' },
  cloud: { name: 'Cloud and DevOps', blurb: 'Containers, CI, deploying, infrastructure as code. Cloud skills are what new SWE hires are being hired for.' },
  ai: { name: 'AI engineering', blurb: 'LLM APIs, RAG, tool-calling agents, MCP and evals: building products on top of models.' },
  craft: { name: 'Working with AI coding tools', blurb: 'Reviewing and testing AI written code, and explaining design decisions.' },
};

const f = (folder: string, re: string) => new RegExp(`^${folder}/${re}`, 'i');

export const LAB: LabTask[] = [
  // ── Foundations ──
  {
    id: 'lab-git', n: 1, track: 'core', title: 'Set up swe-lab with a real Git workflow', mins: 45, folder: '01-git',
    why: 'Every team works in branches and pull requests. Interviewers and managers notice fast when a new grad commits straight to main or can\'t resolve a merge conflict.',
    build: [
      'Create a public GitHub repo named swe-lab and clone it to your laptop.',
      'Make a branch: git switch -c setup. Add 01-git/README.md explaining in your words what a commit, a branch, a merge and a rebase are.',
      'Push the branch and open a pull request. Merge it on GitHub.',
      'Make a deliberate merge conflict: edit the same line on two branches, merge one, then resolve the conflict in the other. Write what you did in 01-git/conflict.md.',
      'Add a .gitignore for Python (venv, __pycache__, .env).',
    ],
    checks: [{ label: '01-git/README.md', path: f('01-git', 'readme\\.md$') }, { label: '01-git/conflict.md', path: f('01-git', 'conflict\\.md$') }, { label: '.gitignore at the root', path: /^\.gitignore$/ }],
    learn: [
      { label: 'Pro Git book (chapters 2 and 3)', url: 'https://git-scm.com/book/en/v2' },
      { label: 'GitHub flow', url: 'https://docs.github.com/en/get-started/using-github/github-flow' },
      { label: 'Learn Git Branching (interactive)', url: 'https://learngitbranching.js.org/' },
    ],
    reflect: ['What is the difference between merge and rebase, and when would you use each?', 'How did you resolve the conflict, step by step?', 'Why should .env never be committed?'],
    interview: ['Walk me through how you get a change into main on a team.', 'You pushed a secret to GitHub. What do you do?'],
  },
  {
    id: 'lab-shell', n: 2, track: 'core', title: 'Shell and scripting: automate something real', mins: 60, folder: '02-shell',
    why: 'On the job you will SSH into boxes, grep logs and chain commands. Comfort in the terminal is assumed, never taught.',
    build: [
      'Read the Missing Semester lectures on the shell and on data wrangling.',
      'Write 02-shell/logstats.sh that takes a log file and prints the 5 most common error messages with counts (use grep, sort, uniq -c, sort -nr, head).',
      'Write 02-shell/sample.log with at least 30 lines so the script has something to chew on.',
      'In 02-shell/README.md, paste the output and explain each command in the pipe.',
    ],
    checks: [{ label: '02-shell/logstats.sh', path: f('02-shell', '.*\\.sh$') }, { label: '02-shell/sample.log', path: f('02-shell', '.*\\.log$') }, { label: '02-shell/README.md', path: f('02-shell', 'readme\\.md$') }],
    learn: [
      { label: 'MIT Missing Semester', url: 'https://missing.csail.mit.edu/' },
      { label: 'explainshell: paste a command, see each part', url: 'https://explainshell.com/' },
    ],
    reflect: ['Explain each stage of your pipe in one line.', 'What does chmod +x do, and why did you need it?', 'How would you watch a log file live?'],
    interview: ['A service is slow in production. Which commands would you run first on the box?', 'How do you find which process is using port 8080?'],
  },
  {
    id: 'lab-tests', n: 3, track: 'core', title: 'Test-driven Python with pytest', mins: 60, folder: '03-tests',
    why: 'Code with tests gets merged; code without tests gets questions. With AI writing more code, being the person who can prove it works is the skill teams pay for.',
    build: [
      'In 03-tests, write a small module (for example a shopping cart with discounts, or an LRU cache).',
      'Write the tests FIRST in test_*.py with pytest: normal cases, edge cases (empty, one item, huge numbers), and an error case with pytest.raises.',
      'Use one fixture and one parametrized test.',
      'Run pytest --cov and put the coverage percentage in 03-tests/README.md.',
    ],
    checks: [{ label: 'a test_*.py file', path: f('03-tests', '(.*/)?test_.*\\.py$') }, { label: 'the module under test', path: f('03-tests', '(?!.*test_).*\\.py$') }, { label: '03-tests/README.md', path: f('03-tests', 'readme\\.md$') }],
    learn: [
      { label: 'pytest: getting started', url: 'https://docs.pytest.org/en/stable/getting-started.html' },
      { label: 'pytest: parametrize', url: 'https://docs.pytest.org/en/stable/how-to/parametrize.html' },
    ],
    reflect: ['Which edge case would have broken your first version?', 'What is a fixture for?', 'Is 100% coverage the goal? Why or why not?'],
    interview: ['How do you test code that calls an external API?', 'What makes a test flaky, and how do you fix it?'],
  },
  {
    id: 'lab-sql', n: 4, track: 'core', title: 'SQL that interviewers actually ask', mins: 60, folder: '04-sql',
    why: 'Almost every backend role touches a relational database, and SQL rounds show up at banks and big tech alike.',
    build: [
      'Do SQLBolt lessons 1 to 12.',
      'In 04-sql/schema.sql, create tables users, orders and order_items with primary and foreign keys.',
      'In 04-sql/queries.sql, write: top 5 customers by total spend (JOIN + GROUP BY + ORDER BY), customers with no orders (LEFT JOIN ... IS NULL), and each user\'s most recent order (window function ROW_NUMBER).',
      'Run them in SQLite or Postgres and paste the results in 04-sql/README.md, plus the index you would add and why.',
    ],
    checks: [{ label: '04-sql/schema.sql', path: f('04-sql', 'schema\\.sql$') }, { label: '04-sql/queries.sql', path: f('04-sql', 'quer.*\\.sql$') }, { label: '04-sql/README.md', path: f('04-sql', 'readme\\.md$') }],
    learn: [
      { label: 'SQLBolt (interactive)', url: 'https://sqlbolt.com/' },
      { label: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/' },
      { label: 'PostgreSQL window functions tutorial', url: 'https://www.postgresql.org/docs/current/tutorial-window.html' },
    ],
    reflect: ['When does an index make a query faster, and when does it hurt?', 'INNER vs LEFT JOIN in one sentence each.', 'What is a transaction and why does it matter for orders?'],
    interview: ['Find the second highest salary.', 'Your query is slow. How do you figure out why? (EXPLAIN)'],
  },

  // ── Performance and systems (quant firms) ──
  {
    id: 'lab-concurrency', n: 22, track: 'systems', title: 'Threads, processes and the GIL, measured', mins: 75, folder: '22-concurrency', needs: ['lab-git'],
    why: 'Quant onsites ask what the GIL really limits and how you would speed up CPU-bound versus I/O-bound work. Having measured it yourself turns a memorized answer into a real one.',
    build: [
      'Write 22-concurrency/bench.py: a CPU-bound job (count primes below 2,000,000 split into 4 chunks) run sequentially, with 4 threads, and with 4 processes (concurrent.futures). Time each.',
      'Add an I/O-bound job (20 calls to time.sleep(0.2), standing in for network calls) run sequentially, with threads, and with asyncio.',
      'Write 22-concurrency/race.py: 4 threads each add 1 to a shared counter 1,000,000 times with counter += 1. Show the wrong total, then fix it with threading.Lock and time both.',
      'Put every timing in 22-concurrency/RESULTS.md with one paragraph explaining each result.',
    ],
    checks: [{ label: '22-concurrency/bench.py', path: f('22-concurrency', 'bench\\.py$') }, { label: '22-concurrency/race.py', path: f('22-concurrency', 'race\\.py$') }, { label: '22-concurrency/RESULTS.md', path: f('22-concurrency', 'results\\.md$') }],
    learn: [
      { label: 'concurrent.futures (Python docs)', url: 'https://docs.python.org/3/library/concurrent.futures.html' },
      { label: 'asyncio (Python docs)', url: 'https://docs.python.org/3/library/asyncio.html' },
      { label: 'PEP 703: making the GIL optional', url: 'https://peps.python.org/pep-0703/' },
    ],
    reflect: ['Why did threads not speed up the prime count but did speed up the sleeps?', 'Why is counter += 1 not atomic even with the GIL?', 'What did the lock cost you, and how would you cut that cost?'],
    interview: ['What does the GIL actually prevent?', 'You need to process 10 GB of trades in Python on one machine. How do you use all the cores?', 'Design a thread-safe counter. What are the options?'],
    resume: 'Benchmarked Python concurrency models (threads, processes, asyncio) on CPU and I/O bound workloads and documented GIL and locking trade-offs.',
  },
  {
    id: 'lab-sockets', n: 23, track: 'systems', title: 'TCP vs UDP: build both and measure latency', mins: 75, folder: '23-sockets', needs: ['lab-git'],
    why: 'TCP versus UDP is a favorite quant firm question because market data and order entry use different ones. Writing raw sockets shows you know what actually happens on the wire.',
    build: [
      'Write a TCP echo server and client in 23-sockets/ using the socket module. The client sends 10,000 small messages one at a time and records each round trip time.',
      'Do the same with UDP. Note what you have to handle yourself (lost or reordered packets, message boundaries).',
      'Run the TCP client with and without TCP_NODELAY and compare.',
      'Write 23-sockets/RESULTS.md: median and 99th percentile round trip for each, and why they differ.',
    ],
    checks: [{ label: 'a TCP script', path: f('23-sockets', '.*tcp.*\\.py$') }, { label: 'a UDP script', path: f('23-sockets', '.*udp.*\\.py$') }, { label: '23-sockets/RESULTS.md', path: f('23-sockets', 'results\\.md$') }],
    learn: [
      { label: 'socket (Python docs)', url: 'https://docs.python.org/3/library/socket.html' },
      { label: 'Beej\'s guide to network programming', url: 'https://beej.us/guide/bgnet/' },
    ],
    reflect: ['What does TCP give you that you had to give up with UDP?', 'What did TCP_NODELAY change and why?', 'Why is the 99th percentile more important than the average for a trading system?'],
    interview: ['Why would market data use UDP multicast but order entry use TCP?', 'Walk me through the TCP handshake.', 'Your latency has rare huge spikes. Where do you look?'],
    resume: 'Built TCP and UDP echo services with raw sockets and measured tail latency, including the effect of Nagle\'s algorithm.',
  },
  {
    id: 'lab-matching', n: 24, track: 'systems', title: 'Order matching engine: test it, profile it, make it fast', mins: 180, folder: '24-matching-engine', needs: ['lab-tests'],
    why: 'An order book is the most reported Citadel coding round and the classic quant resume project. Testing, profiling and optimizing one shows exactly the habits HRT says it grades: correct, idiomatic code and good use of resources.',
    build: [
      'Start from your Practical rounds order book (add, cancel, best bid and ask, price-time matching) as 24-matching-engine/book.py.',
      'Write pytest tests in 24-matching-engine/test_book.py for every edge case: empty book, partial fills, cancel after fill, many orders at one price.',
      'Write bench.py that replays 1,000,000 random orders and cancels and prints orders per second. Profile it with cProfile.',
      'Make it at least 2x faster (O(1) cancel with a lazy flag or linked list, __slots__ on Order, fewer allocations). Record before and after numbers and the profile in PERF.md.',
    ],
    checks: [{ label: '24-matching-engine/book.py', path: f('24-matching-engine', 'book\\.py$') }, { label: 'pytest tests', path: f('24-matching-engine', '(.*/)?test_.*\\.py$') }, { label: 'bench.py', path: f('24-matching-engine', '(.*/)?bench\\.py$') }, { label: 'PERF.md', path: f('24-matching-engine', 'perf\\.md$') }],
    learn: [
      { label: 'The Python profilers (docs)', url: 'https://docs.python.org/3/library/profile.html' },
      { label: 'Python time complexity (wiki)', url: 'https://wiki.python.org/moin/TimeComplexity' },
      { label: 'HRT: how to prepare for the SWE interview', url: 'https://www.hudsonrivertrading.com/?p=10041' },
    ],
    reflect: ['What did the profile show was slowest, and were you surprised?', 'Which change gave the biggest speedup, and why?', 'What would you change to rewrite this in C++?'],
    interview: ['Design an order book. What structure holds each side and why?', 'How do you make cancel O(1)?', 'How would you test a matching engine so you trust it with real money?'],
    resume: 'Built a price-time priority order matching engine in Python with full pytest coverage, then profiled and optimized it to over 2x throughput on 1M orders.',
  },
  // ── Backend ──
  {
    id: 'lab-api', n: 5, track: 'backend', title: 'Build a REST API with FastAPI', mins: 90, folder: '05-api', needs: ['lab-tests'],
    why: 'Designing and building HTTP APIs is the bread and butter of most new grad backend work.',
    build: [
      'In 05-api, build a FastAPI app for a small domain (for example job applications: create, list, update status, delete).',
      'Use Pydantic models for request and response bodies, proper status codes (201, 404, 422) and path plus query parameters.',
      'Write tests with FastAPI\'s TestClient for every endpoint, including a 404 and a validation error.',
      'Add requirements.txt and a README with curl examples.',
    ],
    checks: [{ label: 'a FastAPI app (main.py or app.py)', path: f('05-api', '(.*/)?(main|app)\\.py$') }, { label: 'API tests', path: f('05-api', '(.*/)?test_.*\\.py$') }, { label: 'requirements.txt', path: f('05-api', 'requirements\\.txt$') }],
    learn: [
      { label: 'FastAPI tutorial', url: 'https://fastapi.tiangolo.com/tutorial/' },
      { label: 'MDN: HTTP status codes', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status' },
    ],
    reflect: ['Why 201 instead of 200 for create?', 'PUT vs PATCH?', 'How does FastAPI turn your Pydantic model into validation and docs?'],
    interview: ['Design the endpoints for a URL shortener.', 'How would you version this API?'],
    resume: 'Built a tested REST API in FastAPI with Pydantic validation and full endpoint coverage.',
  },
  {
    id: 'lab-db', n: 6, track: 'backend', title: 'Add Postgres, migrations and auth', mins: 120, folder: '05-api', needs: ['lab-api', 'lab-sql'],
    why: 'Real services persist data and protect it. Connecting an API to Postgres and adding login is where many student projects stop and real ones start.',
    build: [
      'Run Postgres locally with Docker: docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16.',
      'Use SQLAlchemy (or SQLModel) for the tables and Alembic for migrations (an alembic/ folder).',
      'Add signup and login with hashed passwords (bcrypt or argon2) and JWT tokens; protect the write endpoints.',
      'Read secrets from environment variables, and commit a .env.example, never the real .env.',
    ],
    checks: [{ label: 'Alembic migrations', path: f('05-api', '(.*/)?alembic/.*\\.py$') }, { label: '.env.example', path: f('05-api', '(.*/)?\\.env\\.example$') }, { label: 'an auth module', path: f('05-api', '(.*/)?.*auth.*\\.py$') }],
    learn: [
      { label: 'FastAPI: security with OAuth2 and JWT', url: 'https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/' },
      { label: 'Alembic tutorial', url: 'https://alembic.sqlalchemy.org/en/latest/tutorial.html' },
      { label: 'OWASP password storage cheat sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html' },
    ],
    reflect: ['Why hash passwords instead of encrypting them?', 'What is inside a JWT and what must never go in it?', 'What problem do migrations solve?'],
    interview: ['Sessions vs JWTs: trade-offs?', 'How would you prevent SQL injection?'],
    resume: 'Added Postgres persistence with Alembic migrations and JWT authentication with hashed passwords.',
  },

  // ── Cloud ──
  {
    id: 'lab-docker', n: 7, track: 'cloud', title: 'Containerize the API with Docker Compose', mins: 75, folder: '05-api', needs: ['lab-api'],
    why: 'Containers are how almost everything ships now. Knowing what an image, a layer and a port mapping are is baseline cloud literacy.',
    build: [
      'Write a Dockerfile for the API: slim Python base, copy requirements first (layer caching), run as a non-root user.',
      'Write docker-compose.yml with the API and Postgres, a named volume for data, and a healthcheck.',
      'docker compose up, hit the API with curl, then docker compose down and up again and show the data survived.',
      'In the README, explain layer caching and why the image size went down.',
    ],
    checks: [{ label: 'Dockerfile', path: f('05-api', '(.*/)?dockerfile$') }, { label: 'docker-compose.yml', path: f('05-api', '(.*/)?(docker-)?compose\\.ya?ml$') }],
    learn: [
      { label: 'Docker: get started', url: 'https://docs.docker.com/get-started/' },
      { label: 'Dockerfile best practices', url: 'https://docs.docker.com/build/building/best-practices/' },
    ],
    reflect: ['Image vs container?', 'Why copy requirements.txt before the rest of the code?', 'What does the volume do?'],
    interview: ['Your container works locally but not in the cloud. How do you debug it?', 'What is the difference between a VM and a container?'],
    resume: 'Containerized the service with Docker and Docker Compose (API plus Postgres, health checks, persistent volumes).',
  },
  {
    id: 'lab-ci', n: 8, track: 'cloud', title: 'CI with GitHub Actions', mins: 45, folder: '.github', needs: ['lab-tests'], ci: true,
    why: 'Every team runs tests automatically on every pull request. Setting it up yourself shows you understand how code gets to production safely.',
    build: [
      'Add .github/workflows/ci.yml that runs on push and pull_request.',
      'Set up Python, cache pip, install requirements, run ruff (lint) and pytest for 03-tests and 05-api.',
      'Open a PR with a failing test to see CI go red, then fix it and see it go green.',
      'Add the CI status badge to the root README.',
    ],
    checks: [{ label: '.github/workflows/*.yml', path: /^\.github\/workflows\/.*\.ya?ml$/ }],
    learn: [
      { label: 'GitHub Actions: building and testing Python', url: 'https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-python' },
      { label: 'Ruff linter', url: 'https://docs.astral.sh/ruff/' },
    ],
    reflect: ['What does CI catch that you would miss locally?', 'What is a matrix build?', 'Where would secrets for deployment live?'],
    interview: ['Walk me through what happens between git push and your code running in production.', 'CI vs CD?'],
    resume: 'Set up CI with GitHub Actions running lint and tests on every pull request.',
  },
  {
    id: 'lab-deploy', n: 9, track: 'cloud', title: 'Deploy to the cloud (Cloud Run or AWS)', mins: 90, folder: '09-deploy', needs: ['lab-docker'],
    why: 'Shipping to a real cloud is the clearest proof of cloud skills on a resume, and it\'s what interviewers dig into.',
    build: [
      'Pick one: Google Cloud Run (free tier, deploys a container directly) or AWS (App Runner or ECS). Set a billing alert first.',
      'Deploy the API container. Use a managed Postgres or the provider\'s free option, with credentials in the provider\'s secret manager.',
      'In 09-deploy/README.md: the live URL, the exact deploy commands, a screenshot, and a diagram (Mermaid is fine) of request → load balancer → container → database.',
      'Add 09-deploy/teardown.md with the commands to delete everything, and run them when you\'re done if you want to avoid cost.',
    ],
    checks: [{ label: '09-deploy/README.md', path: f('09-deploy', 'readme\\.md$') }, { label: '09-deploy/teardown.md', path: f('09-deploy', 'teardown\\.md$') }],
    learn: [
      { label: 'Cloud Run: deploy a Python service', url: 'https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service' },
      { label: 'AWS free tier', url: 'https://aws.amazon.com/free/' },
      { label: 'AWS: What is App Runner', url: 'https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html' },
    ],
    reflect: ['How does traffic reach your container?', 'How does your app scale when traffic spikes, and what does that cost?', 'Where are your secrets stored now?'],
    interview: ['How would you roll out a bad deploy safely, and roll it back?', 'Serverless containers vs Kubernetes: when would you pick each?'],
    resume: 'Deployed a containerized API to Google Cloud Run with managed Postgres and secret management.',
  },
  {
    id: 'lab-terraform', n: 10, track: 'cloud', title: 'Infrastructure as code with Terraform', mins: 75, folder: '10-terraform', needs: ['lab-deploy'],
    why: 'Teams don\'t click around consoles; they keep infrastructure in code that gets reviewed like everything else.',
    build: [
      'Do HashiCorp\'s Get Started tutorial for your cloud.',
      'In 10-terraform, write main.tf, variables.tf and outputs.tf that create a storage bucket and the service account or IAM role your API needs.',
      'Run terraform init, plan, apply, then destroy. Paste the plan output in the README.',
      'Add a .terraform.lock.hcl and ignore the state files in .gitignore.',
    ],
    checks: [{ label: '10-terraform/main.tf', path: f('10-terraform', 'main\\.tf$') }, { label: 'variables.tf or outputs.tf', path: f('10-terraform', '(variables|outputs)\\.tf$') }],
    learn: [
      { label: 'Terraform: get started (AWS)', url: 'https://developer.hashicorp.com/terraform/tutorials/aws-get-started' },
      { label: 'Terraform: get started (Google Cloud)', url: 'https://developer.hashicorp.com/terraform/tutorials/gcp-get-started' },
    ],
    reflect: ['What is Terraform state and why should it never be in Git?', 'What does plan show you that apply doesn\'t?', 'Least privilege: what permissions did your role really need?'],
    interview: ['Two engineers run terraform apply at the same time. What can go wrong and how do teams prevent it?'],
    resume: 'Managed cloud infrastructure with Terraform (storage, IAM) using reviewed plans.',
  },
  {
    id: 'lab-k8s', n: 11, track: 'cloud', title: 'Kubernetes basics on your laptop', mins: 90, folder: '11-k8s', needs: ['lab-docker'],
    why: 'Kubernetes shows up in a large share of big company backends. Knowing pods, deployments and services lets you follow every infra conversation.',
    build: [
      'Install kind (Kubernetes in Docker) and create a cluster.',
      'Write 11-k8s/deployment.yaml (2 replicas of your API, resource limits, liveness and readiness probes) and service.yaml.',
      'kubectl apply, port-forward, curl it. Delete one pod and watch Kubernetes replace it.',
      'Do a rolling update to a new image tag and write down what kubectl rollout status showed.',
    ],
    checks: [{ label: '11-k8s/deployment.yaml', path: f('11-k8s', '.*deploy.*\\.ya?ml$') }, { label: '11-k8s/service.yaml', path: f('11-k8s', '.*service.*\\.ya?ml$') }],
    learn: [
      { label: 'kind quick start', url: 'https://kind.sigs.k8s.io/docs/user/quick-start/' },
      { label: 'Kubernetes basics tutorial', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/' },
    ],
    reflect: ['Pod vs deployment vs service?', 'What do liveness and readiness probes each protect against?', 'What happened during the rolling update?'],
    interview: ['A pod keeps restarting (CrashLoopBackOff). How do you debug it?'],
  },
  {
    id: 'lab-observe', n: 12, track: 'cloud', title: 'Logging, metrics and tracing', mins: 60, folder: '05-api', needs: ['lab-api'],
    why: 'Being on call means finding out what broke from logs and metrics. Structured logs and traces are what teams expect.',
    build: [
      'Switch the API to structured JSON logs with a request id on every line.',
      'Add OpenTelemetry auto-instrumentation for FastAPI and print traces to the console.',
      'Add a /metrics endpoint (prometheus-client) counting requests and latency by route.',
      'In the README, show one slow request and how you found it in the trace.',
    ],
    checks: [{ label: 'a logging or telemetry module', path: f('05-api', '(.*/)?.*(log|telemetry|otel|metrics).*\\.py$') }],
    learn: [
      { label: 'OpenTelemetry for Python', url: 'https://opentelemetry.io/docs/languages/python/' },
      { label: 'Prometheus Python client', url: 'https://prometheus.github.io/client_python/' },
      { label: 'Google SRE book: monitoring distributed systems', url: 'https://sre.google/sre-book/monitoring-distributed-systems/' },
    ],
    reflect: ['Logs vs metrics vs traces: what question does each answer?', 'What are the four golden signals?'],
    interview: ['Latency on one endpoint doubled after a deploy. Walk me through finding the cause.'],
  },

  // ── AI engineering ──
  {
    id: 'lab-llm', n: 13, track: 'ai', title: 'Call an LLM API with structured output', mins: 60, folder: '13-llm',
    why: 'The starting point of AI engineering: using a model as a component in code, with outputs your program can trust.',
    build: [
      'Use the Gemini API (your key already works) from Python.',
      'Build 13-llm/extract.py: give it a job posting text, get back JSON matching a Pydantic schema (title, company, years_required, skills list, visa_sponsorship).',
      'Handle failures: retries with backoff on 429/5xx, and validation errors when the JSON doesn\'t match.',
      'Read the key from an environment variable. Log token counts and estimate cost per call in the README.',
    ],
    checks: [{ label: '13-llm/extract.py', path: f('13-llm', '.*\\.py$') }, { label: '13-llm/README.md', path: f('13-llm', 'readme\\.md$') }],
    learn: [
      { label: 'Gemini API quickstart', url: 'https://ai.google.dev/gemini-api/docs/quickstart' },
      { label: 'Gemini: structured output', url: 'https://ai.google.dev/gemini-api/docs/structured-output' },
      { label: 'roadmap.sh AI engineer', url: 'https://roadmap.sh/ai-engineer' },
    ],
    reflect: ['What is a token and why does it matter for cost and limits?', 'What did temperature change in your outputs?', 'How do you make an LLM\'s output reliable enough for code to depend on?'],
    interview: ['How would you handle the model being down or slow in production?', 'How would you keep costs under control at 1M calls a day?'],
    resume: 'Built an LLM extraction pipeline with schema-validated structured output, retries and cost tracking.',
  },
  {
    id: 'lab-rag', n: 14, track: 'ai', title: 'RAG: answer questions over your own documents', mins: 120, folder: '14-rag', needs: ['lab-llm'],
    why: 'Retrieval augmented generation is the most common AI feature companies ship. Understanding chunking, embeddings and retrieval is core AI engineering.',
    build: [
      'Pick a corpus you know: your course notes, or the pyforge lesson texts.',
      'Chunk the documents (try two chunk sizes), embed them with the Gemini embeddings API, store them in Chroma (or numpy with cosine similarity).',
      'For a question: retrieve the top 5 chunks, put them in the prompt, and make the model cite which chunk each claim came from.',
      'Write 14-rag/questions.json with 15 questions and the answers you expect.',
    ],
    checks: [{ label: 'ingest or index script', path: f('14-rag', '.*(ingest|index|embed).*\\.py$') }, { label: 'query script', path: f('14-rag', '.*(query|ask|rag|app).*\\.py$') }, { label: '14-rag/questions.json', path: f('14-rag', '.*\\.json$') }],
    learn: [
      { label: 'Gemini: embeddings', url: 'https://ai.google.dev/gemini-api/docs/embeddings' },
      { label: 'Chroma docs', url: 'https://docs.trychroma.com/' },
    ],
    reflect: ['How did chunk size change answer quality?', 'Where does RAG fail (questions it can\'t answer)?', 'What is an embedding, in one sentence a non-engineer would get?'],
    interview: ['Your RAG app gives a confident wrong answer. How do you debug whether it\'s retrieval or generation?', 'How would you keep the index fresh when documents change?'],
    resume: 'Built a retrieval augmented generation system with chunking, vector search (Chroma) and cited answers.',
  },
  {
    id: 'lab-evals', n: 15, track: 'ai', title: 'Evals: measure your AI app like a test suite', mins: 75, folder: '14-rag', needs: ['lab-rag'],
    why: 'Teams shipping AI now treat evals as their test suite. A new grad who can say "accuracy went from 62% to 81% after I changed chunking" stands out.',
    build: [
      'Write 14-rag/eval.py that runs all 15 questions and scores each answer: exact facts present, cites a source, no made up facts. Use an LLM as a judge for the fuzzy part, with a written rubric.',
      'Record retrieval hit rate (was the right chunk in the top 5?) separately from answer quality.',
      'Change one thing (chunk size, top k, prompt) and record the before and after scores in 14-rag/EVALS.md.',
    ],
    checks: [{ label: '14-rag/eval.py', path: f('14-rag', '.*eval.*\\.py$') }, { label: '14-rag/EVALS.md', path: f('14-rag', 'evals?\\.md$') }],
    learn: [
      { label: 'Hamel Husain: Your AI product needs evals', url: 'https://hamel.dev/blog/posts/evals/' },
      { label: 'Anthropic: define success criteria and build evaluations', url: 'https://platform.claude.com/docs/en/test-and-evaluate/develop-tests' },
      { label: 'Anthropic: demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
    ],
    reflect: ['Why measure retrieval and generation separately?', 'Where can an LLM judge be wrong, and how did you check it?', 'What change helped most, and by how much?'],
    interview: ['How do you know your AI feature got better and not worse after a prompt change?'],
    resume: 'Built an evaluation harness for a RAG system (retrieval hit rate plus LLM-judged answer quality) and used it to improve accuracy.',
  },
  {
    id: 'lab-agent', n: 16, track: 'ai', title: 'Build a tool-calling agent from scratch', mins: 120, folder: '16-agent', needs: ['lab-llm'],
    why: 'Agents (models that call tools in a loop) are where a lot of 2026 product work is. Building one without a framework teaches you what frameworks hide.',
    build: [
      'Read Anthropic\'s "Building effective agents".',
      'Write 16-agent/agent.py: a loop where the model can call 3 Python tools you define (for example search your RAG index, run a SQL query on 04-sql data, get today\'s date), using function calling.',
      'Add guardrails: a max step count, a timeout, and refusing any tool input that isn\'t allowed (validate arguments).',
      'Log every step (thought, tool, arguments, result) and include one full trace in the README.',
    ],
    checks: [{ label: '16-agent/agent.py', path: f('16-agent', '.*agent.*\\.py$') }, { label: '16-agent/README.md', path: f('16-agent', 'readme\\.md$') }],
    learn: [
      { label: 'Anthropic: Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
      { label: 'Anthropic: writing effective tools for agents', url: 'https://www.anthropic.com/engineering/writing-tools-for-agents' },
      { label: 'Gemini: function calling', url: 'https://ai.google.dev/gemini-api/docs/function-calling' },
    ],
    reflect: ['When is a fixed workflow better than an agent?', 'How did the loop decide it was done?', 'What did your agent get wrong, and what guardrail would have stopped it?'],
    interview: ['How do you stop an agent from looping forever or running up cost?', 'How would you test an agent?'],
    resume: 'Built a tool-calling LLM agent from scratch with argument validation, step limits and full tracing.',
  },
  {
    id: 'lab-mcp', n: 17, track: 'ai', title: 'Write an MCP server', mins: 90, folder: '17-mcp', needs: ['lab-agent'],
    why: 'MCP (Model Context Protocol) is becoming the standard way to connect AI apps to tools and data. Few new grads have built one.',
    build: [
      'Install the official MCP Python SDK.',
      'In 17-mcp/server.py, expose 2 tools (for example: search your job tracker data, add an application) and 1 resource.',
      'Test it with the MCP Inspector, then connect it to Claude Desktop or Claude Code and use it in a real conversation.',
      'README: a screenshot of it working and an explanation of host, client and server.',
    ],
    checks: [{ label: '17-mcp/server.py', path: f('17-mcp', '.*server.*\\.py$') }, { label: '17-mcp/README.md', path: f('17-mcp', 'readme\\.md$') }],
    learn: [
      { label: 'MCP: official docs', url: 'https://modelcontextprotocol.io/' },
      { label: 'MCP Python SDK', url: 'https://github.com/modelcontextprotocol/python-sdk' },
      { label: 'Real Python: Python MCP', url: 'https://realpython.com/python-mcp/' },
    ],
    reflect: ['Tools vs resources vs prompts in MCP?', 'How is MCP different from RAG?', 'What security risk comes with giving a model write tools?'],
    interview: ['How would you let an assistant act on a user\'s data safely?'],
    resume: 'Built a Model Context Protocol (MCP) server exposing custom tools and data to AI assistants.',
  },
  {
    id: 'lab-ai-security', n: 18, track: 'ai', title: 'Break and defend your AI app', mins: 60, folder: '18-ai-security', needs: ['lab-rag'],
    why: 'Prompt injection and data leaks are the top risks in shipped AI features, and interviewers increasingly ask how you\'d handle them.',
    build: [
      'Read the OWASP Top 10 for LLM applications.',
      'Attack your own RAG or agent: put an instruction inside a document ("ignore your rules and..."), try to make it reveal the system prompt, try to make the agent call a tool it shouldn\'t.',
      'Add defenses: separate trusted instructions from retrieved text, allowlist tool arguments, require confirmation for write actions.',
      'Write 18-ai-security/REPORT.md: each attack, whether it worked, the fix, and whether the fix held.',
    ],
    checks: [{ label: '18-ai-security/REPORT.md', path: f('18-ai-security', 'report\\.md$') }],
    learn: [
      { label: 'OWASP Top 10 for LLM applications', url: 'https://genai.owasp.org/llm-top-10/' },
      { label: 'Simon Willison on prompt injection', url: 'https://simonwillison.net/tags/prompt-injection/' },
    ],
    reflect: ['Why can\'t prompting alone fully stop prompt injection?', 'Which defense did the most, and why?'],
    interview: ['A user uploads a document that tells your assistant to email out data. How do you design against that?'],
  },

  // ── Craft ──
  {
    id: 'lab-review', n: 19, track: 'craft', title: 'Review AI written code like a senior engineer', mins: 60, folder: '19-review',
    why: 'Recruiters now want people who can read, audit and extend code an AI wrote. This is that skill, on purpose.',
    build: [
      'Ask an AI assistant to write a ~150 line Python module (for example a rate limiter or a CSV importer).',
      'Review it like a pull request: find at least 5 real problems (bugs, missing edge cases, security, performance, unclear naming). Write each in 19-review/REVIEW.md with the line, why it matters and the fix.',
      'Write tests that fail on the original and pass on your fixed version.',
    ],
    checks: [{ label: '19-review/REVIEW.md', path: f('19-review', 'review\\.md$') }, { label: 'tests for the fixes', path: f('19-review', '(.*/)?test_.*\\.py$') }],
    learn: [
      { label: 'Google: how to do a code review', url: 'https://google.github.io/eng-practices/review/reviewer/' },
      { label: 'Google: what to look for in a review', url: 'https://google.github.io/eng-practices/review/reviewer/looking-for.html' },
    ],
    reflect: ['Which problem would have reached production unnoticed?', 'What does AI code tend to get wrong?'],
    interview: ['How do you use AI tools at work without lowering quality?', 'Here is a function. What would you flag in review?'],
  },
  {
    id: 'lab-design-doc', n: 20, track: 'craft', title: 'Write a one-page design doc', mins: 60, folder: '20-design',
    why: 'Writing down a design before building it is how engineers at Google, Meta and Amazon get alignment. New grads who do it early get trusted with bigger work.',
    build: [
      'Pick the capstone below (or a feature for GeoZane or your job tracker).',
      'Write 20-design/DESIGN.md: context, goals and non-goals, the design with a diagram, alternatives you rejected and why, risks, and how you\'ll measure success.',
      'Ask a friend (or an AI) to poke holes in it, and add a "Changes after review" section.',
    ],
    checks: [{ label: '20-design/DESIGN.md', path: f('20-design', 'design\\.md$') }],
    learn: [
      { label: 'Design docs at Google', url: 'https://www.industrialempathy.com/posts/design-docs-at-google/' },
      { label: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer' },
    ],
    reflect: ['Which alternative was hardest to give up, and why?', 'What would make this design fail?'],
    interview: ['Tell me about a technical decision you made and the trade-offs.'],
  },
  {
    id: 'lab-capstone', n: 21, track: 'ai', title: 'Capstone: ship an AI interview prep assistant', mins: 360, folder: '21-capstone', needs: ['lab-deploy', 'lab-rag', 'lab-evals', 'lab-ci'],
    why: 'One deployed, tested, evaluated AI product ties every skill together and is the strongest resume project you can have as a new grad.',
    build: [
      'Combine the pieces: a FastAPI service that answers interview prep questions with RAG over curated notes, plus an agent tool that quizzes you.',
      'Postgres for users and history, Docker, CI with tests and the eval suite, deployed to the cloud, logs and metrics.',
      'A README with architecture diagram, live link, eval results and what you\'d do next.',
      'Record a 2 minute demo video and link it.',
    ],
    checks: [{ label: '21-capstone/README.md', path: f('21-capstone', 'readme\\.md$') }, { label: 'a Dockerfile', path: f('21-capstone', '(.*/)?dockerfile$') }, { label: 'tests', path: f('21-capstone', '(.*/)?test_.*\\.py$') }, { label: 'evals', path: f('21-capstone', '(.*/)?.*eval.*\\.py$') }],
    learn: [
      { label: 'roadmap.sh AI engineer', url: 'https://roadmap.sh/ai-engineer' },
      { label: 'Anthropic: demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
    ],
    reflect: ['What would break first at 1,000 users?', 'Which eval number are you proudest of?', 'Explain the architecture in 60 seconds.'],
    interview: ['Walk me through your project end to end. What would you do differently?'],
    resume: 'Built and deployed an AI interview prep assistant: FastAPI, RAG with evals, Postgres, Docker, CI/CD and cloud deployment.',
  },
];

export const LAB_BY_ID = Object.fromEntries(LAB.map((t) => [t.id, t])) as Record<string, LabTask>;
