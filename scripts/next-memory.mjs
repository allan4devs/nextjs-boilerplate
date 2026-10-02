import { createRequire } from "node:module";

// Next dev forks a server and otherwise allows half the machine's RAM as heap.
// NODE_OPTIONS is needed as well as execArgv: Next reads the former for its cap.
// Preserve other Node flags while ensuring the child inherits our 4 GiB limit.
const previous = (process.env.NODE_OPTIONS || "")
  .replace(/--max[-_]old[-_]space[-_]size(?:=|\s+)\d+/g, "")
  .trim();
process.env.NODE_OPTIONS = `${previous} --max-old-space-size=4096`.trim();

const require = createRequire(import.meta.url);
const cli = require.resolve("next/dist/bin/next");
process.argv[1] = cli;
require(cli);
