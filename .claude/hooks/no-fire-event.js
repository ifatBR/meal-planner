#!/usr/bin/env node
const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const toolInput = data.tool_input || {};
  const filePath = toolInput.file_path || "";
  const content = toolInput.content || toolInput.new_string || "";

  const isTestFile = /\.(test|spec)\.[jt]sx?$/.test(filePath);
  if (isTestFile) {
    const hasFireEvent = /fireEvent/.test(content);

    if (hasFireEvent) {
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
              "Use userEvent from @testing-library/user-event instead of fireEvent. It better simulates real user interactions.",
          },
        }),
      );
    }
  }
});
