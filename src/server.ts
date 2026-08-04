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

// 1. Get All Registered BFA Tools
app.get('/api/bfa/tools', (req: Request, res: Response) => {
  res.json(ToolRegistry.getAllTools());
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

// 5. Get Benchmark Metrics
app.get('/api/bfa/metrics', (req: Request, res: Response) => {
  const metrics = BenchmarkSuite.runFullBenchmark();
  res.json(metrics);
});

// Fallback middleware serving index.html
app.use((req: Request, res: Response) => {
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
