import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ToolRegistry } from './bfa-gateway/toolRegistry';
import { BFACore, BFAExecutionRequest } from './bfa-gateway/bfaCore';
import { AuditLogger } from './bfa-gateway/auditLogger';
import { AgentSimulator } from './agents/agentSimulator';
import { NaturalAgentEngine } from './agents/naturalAgent';
import { BenchmarkSuite } from './evaluation/benchmark';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// REST API Endpoints

// 1. Get All Registered BFA Tools (excludes honeypots from public agent view)
app.get('/api/bfa/tools', (req: Request, res: Response) => {
  const includeHoneypots = req.query.includeHoneypots === 'true';
  const tools = ToolRegistry.getAllTools();
  res.json(includeHoneypots ? tools : tools.filter(t => !t.isHoneypot));
});

// 1b. Health check — fast connectivity probe for dashboard
app.get('/api/bfa/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    microservices: ['UserService', 'RoomService', 'OrderService', 'NotificationService'],
    toolsRegistered: ToolRegistry.getAllTools().filter(t => !t.isHoneypot).length,
    timestamp: new Date().toISOString()
  });
});

// 2. Execute BFA Tool Call
app.post('/api/bfa/execute', (req: Request, res: Response) => {
  const { userToken, agentToken, toolName, args } = req.body;
  if (!toolName || !args) {
    return res.status(400).json({ error: 'Missing required toolName or args in body payload.' });
  }

  const result = BFACore.executeTool({
    userToken: userToken || 'usr_student_01',
    agentToken: agentToken || 'agent_custom',
    toolName,
    args
  });

  res.json(result);
});

// 3. Trigger Agent Simulation Scenario
app.post('/api/bfa/simulate', (req: Request, res: Response) => {
  const { scenario } = req.body;
  let result;

  if (scenario === 'campus_normal') {
    result = AgentSimulator.runCampusAssistant();
  } else if (scenario === 'faculty_procurement') {
    result = AgentSimulator.runProcurementHelper();
  } else if (scenario === 'adversarial_attack') {
    result = AgentSimulator.runAdversarialAgent();
  } else {
    return res.status(400).json({ error: `Unknown scenario '${scenario}'.` });
  }

  res.json(result);
});

// 3b. Interactive Natural Language AI Agent Chat
app.post('/api/bfa/chat', (req: Request, res: Response) => {
  const { message, userToken } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message in payload.' });
  }

  const result = NaturalAgentEngine.processQuery(message, userToken || 'usr_student_01');
  res.json(result);
});

// 4. Query Audit Logs
app.get('/api/bfa/audit-logs', (req: Request, res: Response) => {
  const verdict  = req.query.verdict  as string | undefined;
  const userId   = req.query.userId   as string | undefined;
  const toolName = req.query.toolName as string | undefined;
  const logs = AuditLogger.getLogs({ verdict, userId, toolName });
  res.json(logs);
});

// 4b. Clear Audit Logs
app.post('/api/bfa/audit-logs/clear', (_req: Request, res: Response) => {
  AuditLogger.clearLogs();
  res.json({ success: true, message: 'Audit logs cleared.' });
});

// 5. Get Benchmark Metrics (cached — instant response)
app.get('/api/bfa/metrics', (_req: Request, res: Response) => {
  res.json(BenchmarkSuite.getCachedMetrics());
});

// 5b. Run full benchmark suite (heavy — only on explicit request)
app.post('/api/bfa/metrics/run', (_req: Request, res: Response) => {
  const metrics = BenchmarkSuite.runFullBenchmark();
  res.json(metrics);
});

// API 404 — return JSON instead of dashboard HTML for unknown API routes
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Fallback middleware serving index.html for SPA routes
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Back-end for Agents (BFA) Server Running!`);
    console.log(`🌐 Dashboard URL: http://localhost:${port}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(Number(PORT));
