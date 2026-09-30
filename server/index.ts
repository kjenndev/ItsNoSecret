import { app } from './app.ts';
import { shutdown } from './lifecycle.ts';
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    shutdown(server).then(() => {clearTimeout(deadline); process.exitCode = 0;}, () => {clearTimeout(deadline); process.exitCode = 1;});
  });
}
