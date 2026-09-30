# CLI instructions

CLI modules parse arguments, initialize provider clients, invoke controllers and
format output. Keep provider protocol, persistence and business policy in their
existing layers. Never print credentials or raw provider errors. Paid operations
require an explicit execution flag; a default invocation is a read-only plan.
