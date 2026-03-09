# Prompts

```text
Currently building @docs/SPEC.md

Please evaluate the existing codebase to check whether authentication and database access are implemented correctly (in line with the expectations explained in @docs/SPEC.md and the official documentation for the libraries/technologies used).

Use web search or the context7 mcp to look up docs
```

```text
We added authentication (see @app/authenticate/page.tsx, @lib/auth.ts)

As a next step, add the following features:
- after successful authentication, redirect the user to "/dashboard"
- protect "/dashboard" and all other word definition-related routes (except the publicly shared word definition route) from unauthenticated access => add protection on a per-route level (NOT via layout)

Use modern Next.js features and focus on writing clean, efficient React/Next.js code.
```

```text
Add the following features to our web app:
- header component with title logo ("NextWordDefinition") which links to "/dashboard" (using Next <Link>)
- on @app/dashboard/page.tsx, add "New Definition" link that links to the appropriate route (e.g., "/dashboard/new")
- on the "New Definition" route, add a <form> with title input and rich text content input
- implement form submission handling + insert data into database

Ensure modern, clean React & Next.js code with accessible JSX and clean, modern Tailwind styling.

Also add a logout button to the header that links to "/auth/logout" (when the user is authenticated)
```

```text
On the new definition (or edit definition) page, add a toolbar that exposes the TipTap tools we want in our app (see @docs/SPEC.md for details) and makes using them simple.
```

```text
Fix the following issues (IGNORE all other):
3. Make sure we fully sanitize all user-generated input
6. I added DB_PATH => make sure it's used
8. (also for other related points): Make sure we show user-friendly helpful error messages WITHOUT leaking any internal/sensitive information (not even in the response sent back to the client!)
14. Improve useState() using common best practices
```

```text
In our app, make the notes editable and deletable.

When viewing a note (as the creator of it), on that viewing page, there should be "Edit" and "Delete" buttons.

"Edit" should be a link to the edit page where the note gets loaded into the TipTap editor. The title also should be editable.

"Delete" should be a button that opens a confirmation <dialog>. Once confirmed, the note should be removed from the database and the user should be navigated back to the "/dashboard" route.
```

```text
In our web-app, add the "public sharing" feature detailed in @docs/SPEC.md.

When adding or editing a word definition, the user (owner) should be able to turn on public sharing. This MUST generate a unique link that leads to the word definition page.

When other users (including guest users who did not sign in) follow that link, they can see the word definition but of course they can't edit or delete it. If sharing is turned off, the link should not lead anywhere anymore.
```
