---
description: Review code for bugs, performance, and security issues, and provide feedback on code style and structure. Use this skill when asked to perform code reviews or after finishing major tasks or after refactoring code.
allowed-tools: Read(*)
---

MODE: $ARGUMENTS

If MODE is one of the following, adjust the review as described:

- MODE == BUGS: Focus ONLY on logical or other bugs.
- MODE == SECURITY: Focus ONLY on security issues.
- MODE == PERFORMANCE: Focus ONLY on performance issues.
- MODE == STYLE: Focus ONLY on code style and structure.

If MODE is not one of the above, do not adjust the review.

MODE can also be set to a combination like "BUGS PERFORMANCE" to focus on multiple areas => Perform the combined review in that case.

If MODE is set to anything else or nothing at all, perform a thorough, general code review.

Perform an in-depth code review of the entire codebase.

Carefully and thoroughly explore the codebase file-by-file to find potential issues and improvements.

Don't rush it, instead make sure you fully understand the code structure and architecture.

Create a detailed report of all your findings.
