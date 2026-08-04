import readline from 'readline';
import { NaturalAgentEngine } from './agents/naturalAgent';

// Strip Windows PowerShell caret escapes (^ chars injected by cmd/ps quoting)
function cleanArg(raw: string): string {
  return raw.replace(/\^/g, '').trim();
}

// ─── ONE-SHOT MODE: npm run agent -- "Your query here" ───────────────────────
const rawArgs = process.argv.slice(2);
if (rawArgs.length > 0) {
  const query = cleanArg(rawArgs.join(' '));
  console.log('');
  console.log('═'.repeat(60));
  console.log('   🤖 BFA AI AGENT — ONE-SHOT QUERY');
  console.log('═'.repeat(60));
  console.log(`💬 Query: "${query}"\n`);

  const res = NaturalAgentEngine.processQuery(query, 'usr_student_01');
  console.log(`🧠 Thought Process : ${res.thoughtProcess}`);
  if (res.toolSelected) {
    console.log(`🔧 BFA Tool Selected: ${res.toolSelected}`);
    console.log(`📦 Extracted Args  : ${JSON.stringify(res.extractedArgs)}`);
    console.log(`🛡️  Policy Verdict  : ${res.bfaVerdict} [${res.policyRule || 'N/A'}]`);
  }
  console.log('');
  console.log(`🤖 Response:\n${res.naturalResponse}`);
  console.log('═'.repeat(60));
  process.exit(0);
}

// ─── NON-TTY GUARD (piped/IDE terminal — just print usage) ──────────────────
if (!process.stdin.isTTY) {
  console.log('');
  console.log('BFA AI Agent CLI');
  console.log('Usage: npm run agent -- "<your query>"');
  console.log('  Example: npm run agent -- "Show my timetable"');
  console.log('  Example: npm run agent -- "Book room_201 in bldg_cs for Wed 10:00-12:00"');
  console.log('  Example: npm run agent -- "Cancel booking bk_102 for Bob"');
  console.log('');
  process.exit(0);
}

// ─── INTERACTIVE MODE (real terminal) ────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('');
console.log('═'.repeat(60));
console.log('   🤖 BFA AI AGENT — INTERACTIVE TERMINAL');
console.log('═'.repeat(60));
console.log('Commands: timetable | book room | cancel booking | inventory |');
console.log('          order supplies | order status | send notification');
console.log('Type "exit" to quit.\n');

function askUser() {
  rl.question('💬 You > ', (raw) => {
    const query = cleanArg(raw);
    if (!query || query.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!\n');
      rl.close();
      process.exit(0);
    }

    const res = NaturalAgentEngine.processQuery(query, 'usr_student_01');
    console.log(`\n🧠 ${res.thoughtProcess}`);
    if (res.toolSelected) {
      console.log(`🔧 Tool    : ${res.toolSelected}`);
      console.log(`📦 Args    : ${JSON.stringify(res.extractedArgs)}`);
      console.log(`🛡️  Verdict : ${res.bfaVerdict} [${res.policyRule || 'N/A'}]`);
    }
    console.log(`\n🤖 ${res.naturalResponse}\n`);
    askUser();
  });
}

askUser();
